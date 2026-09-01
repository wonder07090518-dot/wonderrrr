import { handleUpload } from '@vercel/blob/client';
import { createHash } from 'node:crypto';
import { kv, storageConfigured } from './_admin.js';
import { getCurrentUser } from './_user.js';

const MAX_FILE_BYTES = 1024 * 1024 * 1024;
const MAX_ORDER_BYTES = 1024 * 1024 * 1024;
const MAX_ORDER_FILES = 20;
const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;
const allowedContentTypes = [
  'image/*', 'video/*', 'audio/*', 'text/*', 'application/pdf', 'application/zip',
  'application/x-zip-compressed', 'application/octet-stream', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/postscript'
];

function cleanText(value, length = 220) {
  return String(value || '').trim().slice(0, length).replace(/[\r\n\0]/g, ' ');
}

function parsePayload(value) {
  try { return JSON.parse(value || '{}'); }
  catch { throw new Error('Invalid upload details'); }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured() || !process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Private file storage is not configured' });
  try {
    const json = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser(req);
        if (!user) throw new Error('Please sign in before uploading reference files');
        const payload = parsePayload(clientPayload);
        const orderId = cleanText(payload.orderId, 40);
        const size = Number(payload.size);
        if (!/^WA\d{7,16}$/.test(orderId) || !pathname.startsWith(`orders/${orderId}/`)) throw new Error('Invalid order upload path');
        if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_FILE_BYTES) throw new Error('Reference file is too large');

        const ownerKey = `wonder:upload-owner:${orderId}`;
        const bytesKey = `wonder:upload-bytes:${orderId}`;
        const filesKey = `wonder:upload-files:${orderId}`;
        const fileFingerprint = createHash('sha256').update(`${payload.path}\0${size}`).digest('hex').slice(0, 24);
        const reservationKey = `wonder:upload-reservation:${orderId}:${fileFingerprint}`;
        await kv('setnx', ownerKey, user.email);
        const owner = await kv('get', ownerKey);
        if (String(owner).toLowerCase() !== user.email) throw new Error('This upload belongs to another account');
        const isNewReservation = Number(await kv('setnx', reservationKey, size)) === 1;
        if (isNewReservation) {
          const [reservedBytes, reservedFiles] = await Promise.all([kv('incrby', bytesKey, size), kv('incr', filesKey)]);
          if (Number(reservedBytes) > MAX_ORDER_BYTES || Number(reservedFiles) > MAX_ORDER_FILES) {
            await Promise.all([kv('decrby', bytesKey, size), kv('decr', filesKey), kv('del', reservationKey)]);
            throw new Error('Reference files exceed the order upload limit');
          }
        }
        await Promise.all([kv('expire', ownerKey, 7200), kv('expire', bytesKey, 7200), kv('expire', filesKey, 7200), kv('expire', reservationKey, 7200)]);

        return {
          allowedContentTypes,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + TOKEN_LIFETIME_MS,
          cacheControlMaxAge: 60,
          tokenPayload: JSON.stringify({
            orderId,
            email: user.email,
            name: cleanText(payload.name, 180),
            path: cleanText(payload.path, 300),
            size
          })
        };
      },
      onUploadCompleted: async () => {}
    });
    return res.status(200).json(json);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Reference upload failed' });
  }
}
