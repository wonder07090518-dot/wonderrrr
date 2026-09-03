import { configured, isAdmin, kv, storageConfigured } from './_admin.js';
import { availableServices, servicePrices } from './_catalog.js';
import { getCurrentUser } from './_user.js';
import { head, issueSignedToken, presignUrl } from '@vercel/blob';

const TURNAROUNDS = new Set(['standard', 'rush-request']);
function validOrder(order) { return order && order.id && availableServices.has(order.service) && order.email && order.idea && ['微信支付', '支付宝', '余额支付'].includes(order.payment) && (!order.turnaround || TURNAROUNDS.has(order.turnaround)); }
async function load(id) { const raw = await kv('get', `wonder:order:${id}`); return raw ? JSON.parse(raw) : null; }
const MAX_REFERENCE_FILES = 100;
const MAX_REFERENCE_BYTES = 1024 * 1024 * 1024;
async function referenceMetadata(items, orderId) {
  if (!Array.isArray(items)) return [];
  if (items.length > MAX_REFERENCE_FILES) throw Object.assign(new Error('Too many reference files'), { status: 413 });
  const cleaned = items.map(item => ({
    name: String(item?.name || '').trim().slice(0, 120).replace(/[\\/]/g, '-'),
    path: String(item?.path || item?.name || '').trim().slice(0, 240).replace(/[\r\n\0]/g, ''),
    size: Math.max(0, Number(item?.size) || 0),
    type: String(item?.type || '').trim().slice(0, 100),
    blobPathname: String(item?.blobPathname || '').trim().slice(0, 500),
    blobUrl: String(item?.blobUrl || '').trim().slice(0, 1200)
  })).filter(item => item.name);
  const verified = await Promise.all(cleaned.map(async item => {
    if (!item.blobPathname.startsWith(`orders/${orderId}/`) || !/^https:\/\/[a-z0-9]+\.private\.blob\.vercel-storage\.com\//i.test(item.blobUrl)) throw Object.assign(new Error('Invalid reference file record'), { status: 400 });
    const blob = await head(item.blobUrl);
    if (blob.pathname !== item.blobPathname || blob.size !== item.size || blob.size <= 0) throw Object.assign(new Error('Reference file could not be verified'), { status: 400 });
    return { name: item.name, path: item.path, size: blob.size, type: blob.contentType || item.type, blobPathname: blob.pathname };
  }));
  if (verified.reduce((total, item) => total + item.size, 0) > MAX_REFERENCE_BYTES) throw Object.assign(new Error('Reference files exceed the 1 GB order limit'), { status: 413 });
  return verified;
}

async function createReferenceDownload(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Private file storage is not configured' });
  const orderId = String(req.body?.orderId || '').trim().slice(0, 40);
  const index = Number(req.body?.index);
  if (!orderId || !Number.isInteger(index) || index < 0) return res.status(400).json({ error: 'Missing file details' });
  const raw = await kv('get', `wonder:order:${orderId}`);
  if (!raw) return res.status(404).json({ error: 'Order not found' });
  const order = JSON.parse(raw);
  const reference = Array.isArray(order.referenceFiles) ? order.referenceFiles[index] : null;
  if (!reference?.blobPathname || !reference.blobPathname.startsWith(`orders/${orderId}/`)) return res.status(404).json({ error: 'Reference file not found' });
  const validUntil = Date.now() + 10 * 60 * 1000;
  const token = await issueSignedToken({ pathname: reference.blobPathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { pathname: reference.blobPathname, operation: 'get', validUntil });
  return res.status(200).json({ url: presignedUrl, name: reference.name, expiresIn: 600 });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (req.query?.action === 'reference-download') return createReferenceDownload(req, res);
    if (!storageConfigured()) return res.status(503).json({ error: 'Order storage is not configured', setup: true });
    if (!validOrder(req.body)) return res.status(400).json({ error: 'Missing order details' });
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in before submitting an order' });
    if (String(req.body.email).toLowerCase() !== user.email) return res.status(403).json({ error: 'Order email does not match the signed-in account' });
    const existing = await load(req.body.id);
    if (existing) {
      if (String(existing.email).toLowerCase() !== user.email) return res.status(409).json({ error: 'Order ID already exists' });
      return res.status(200).json({ ok: true, duplicate: true });
    }
    let references;
    try { references = await referenceMetadata(req.body.referenceFiles, req.body.id); }
    catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
    const now = new Date().toISOString();
    const order = { ...req.body, referenceAttachments: undefined, referenceFiles: references, email: user.email, price: servicePrices[req.body.service], turnaround: TURNAROUNDS.has(req.body.turnaround) ? req.body.turnaround : 'standard', status: '审核中', createdAt: now, updatedAt: now };
    delete order.referenceAttachments;
    await kv('set', `wonder:order:${order.id}`, JSON.stringify(order));
    await kv('zadd', 'wonder:orders', Date.now(), order.id);
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'GET') {
    if (!storageConfigured()) return res.status(503).json({ error: 'Order storage is not configured', setup: true });
    if (isAdmin(req)) {
      const ids = await kv('zrevrange', 'wonder:orders', 0, 199);
      const orders = (await Promise.all((ids || []).map(load))).filter(Boolean);
      return res.status(200).json({ orders });
    }
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in to view your orders' });
    const ids = await kv('zrevrange', 'wonder:orders', 0, 199);
    const orders = (await Promise.all((ids || []).map(load))).filter(order => order && String(order.email).toLowerCase() === user.email);
    return res.status(200).json({ orders });
  }
  if (!configured() || !storageConfigured()) return res.status(503).json({ error: 'Admin storage is not configured', setup: true });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  if (req.method === 'PUT') {
    const id = req.query.id; const existing = await load(id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (req.body?.action === 'approve-rush') {
      if (existing.turnaround !== 'rush-request') return res.status(409).json({ error: 'This order has no pending rush request' });
      const finalAmount = Number(req.body?.finalAmount);
      if (!Number.isFinite(finalAmount) || finalAmount <= 0 || finalAmount > 99999) return res.status(400).json({ error: 'Invalid rush quote' });
      const now = new Date().toISOString();
      const approved = { ...existing, basePrice: existing.price, price: `¥${Math.round(finalAmount * 100) / 100}`, turnaround: 'rush-approved', rushApprovedAt: now, status: '待确认支付', updatedAt: now };
      await kv('set', `wonder:order:${id}`, JSON.stringify(approved));
      return res.status(200).json({ ok: true, order: approved });
    }
    const status = req.body?.status;
    if (!['审核中', '待确认支付', '已支付', '制作中', '修改申请', '修改中', '已交付'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const revisions = Array.isArray(existing.revisions) ? [...existing.revisions] : [];
    const latestIndex = revisions.length - 1;
    if (latestIndex >= 0 && status === '修改中' && revisions[latestIndex].status === '待处理') revisions[latestIndex] = { ...revisions[latestIndex], status: '修改中', startedAt: new Date().toISOString() };
    if (latestIndex >= 0 && status === '已交付' && ['待处理', '修改中'].includes(revisions[latestIndex].status)) revisions[latestIndex] = { ...revisions[latestIndex], status: '已完成', completedAt: new Date().toISOString() };
    await kv('set', `wonder:order:${id}`, JSON.stringify({ ...existing, status, revisions, updatedAt: new Date().toISOString() }));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
