import { configured, isAdmin, kv, storageConfigured } from './_admin.js';
import { availableServices, servicePrices } from './_catalog.js';
import { getCurrentUser } from './_user.js';

function validOrder(order) { return order && order.id && availableServices.has(order.service) && order.email && order.idea && ['微信支付', '支付宝'].includes(order.payment); }
async function load(id) { const raw = await kv('get', `wonder:order:${id}`); return raw ? JSON.parse(raw) : null; }

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!storageConfigured()) return res.status(503).json({ error: 'Order storage is not configured', setup: true });
    if (!validOrder(req.body)) return res.status(400).json({ error: 'Missing order details' });
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in before submitting an order' });
    if (String(req.body.email).toLowerCase() !== user.email) return res.status(403).json({ error: 'Order email does not match the signed-in account' });
    const order = { ...req.body, email: user.email, price: servicePrices[req.body.service], status: '审核中', createdAt: new Date().toISOString() };
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
