import { issueSignedToken, presignUrl } from '@vercel/blob';
import { isAdmin, kv, storageConfigured } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  if (!storageConfigured() || !process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Private file storage is not configured' });
  const orderId = String(req.body?.orderId || '').trim().slice(0, 40);
  const index = Number(req.body?.index);
  if (!orderId || !Number.isInteger(index) || index < 0) return res.status(400).json({ error: 'Missing file details' });
  const raw = await kv('get', `wonder:order:${orderId}`);
  if (!raw) return res.status(404).json({ error: 'Order not found' });
  const order = JSON.parse(raw);
  const reference = Array.isArray(order.referenceFiles) ? order.referenceFiles[index] : null;
  if (!reference?.blobPathname || !reference.blobPathname.startsWith(`orders/${orderId}/`)) return res.status(404).json({ error: 'Reference file not found' });
  const validUntil = Date.now() + 10 * 60 * 1000;
  const token = await issueSignedToken({
    pathname: reference.blobPathname,
    operations: ['get'],
    validUntil
  });
  const { presignedUrl } = await presignUrl(token, {
    pathname: reference.blobPathname,
    operation: 'get',
    validUntil
  });
  return res.status(200).json({ url: presignedUrl, name: reference.name, expiresIn: 600 });
}
