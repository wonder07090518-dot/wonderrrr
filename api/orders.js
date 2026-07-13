import { configured, isAdmin, kv, storageConfigured } from './_admin.js';

function validOrder(order) { return order && order.id && order.service && order.email && order.idea && order.payment; }
async function load(id) { const raw = await kv('get', `wonder:order:${id}`); return raw ? JSON.parse(raw) : null; }

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!storageConfigured()) return res.status(202).json({ ok: true, queued: false, setup: true });
    if (!validOrder(req.body)) return res.status(400).json({ error: 'Missing order details' });
    const order = { ...req.body, status: req.body.status || '审核中', createdAt: new Date().toISOString() };
    await kv('set', `wonder:order:${order.id}`, JSON.stringify(order));
    await kv('zadd', 'wonder:orders', Date.now(), order.id);
    return res.status(201).json({ ok: true });
  }
  if (!configured() || !storageConfigured()) return res.status(503).json({ error: 'Admin storage is not configured', setup: true });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  if (req.method === 'GET') {
    const ids = await kv('zrevrange', 'wonder:orders', 0, 199);
    const orders = (await Promise.all((ids || []).map(load))).filter(Boolean);
    return res.status(200).json({ orders });
  }
  if (req.method === 'PUT') {
    const id = req.query.id; const existing = await load(id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    const status = req.body?.status;
    if (!['审核中', '待确认支付', '已支付', '制作中', '已交付'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await kv('set', `wonder:order:${id}`, JSON.stringify({ ...existing, status, updatedAt: new Date().toISOString() }));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
