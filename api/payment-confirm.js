import { kv, storageConfigured } from './_admin.js';
import { getCurrentUser } from './_user.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const paymentMethods = new Set(['微信支付', '支付宝']);

async function loadOrder(id) {
  const raw = await kv('get', `wonder:order:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function notifyOwner(order) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `payment-confirm-${order.id}` },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [OWNER_EMAIL],
      subject: `Wonder Ad Lab 客户已确认付款 ${order.id}`,
      text: `客户提交了付款确认，请核对实际到账后再将订单改为“已支付”。\n\n订单号：${order.id}\n项目：${order.service}\n项目价格：${order.price}\n支付方式：${order.payment}\n客户邮箱：${order.email}`,
      reply_to: order.email
    })
  });
  return response.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Order storage is not configured', setup: true });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in before confirming payment' });
  const orderId = String(req.body?.orderId || '').trim().slice(0, 40);
  const payment = String(req.body?.payment || '').trim();
  if (!orderId || !paymentMethods.has(payment)) return res.status(400).json({ error: 'Missing payment confirmation details' });
  const order = await loadOrder(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (String(order.email).toLowerCase() !== user.email) return res.status(403).json({ error: 'This order does not belong to your account' });
  if (!['审核中', '待支付', '待确认支付'].includes(order.status)) return res.status(409).json({ error: 'This order cannot be confirmed for payment in its current status' });
  const firstConfirmation = order.status !== '待确认支付' || !order.paymentConfirmedAt;
  const updatedOrder = { ...order, payment, status: '待确认支付', paymentConfirmedAt: order.paymentConfirmedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  await kv('set', `wonder:order:${order.id}`, JSON.stringify(updatedOrder));
  let emailSent = true;
  if (firstConfirmation) {
    try { emailSent = await notifyOwner(updatedOrder); } catch { emailSent = false; }
  }
  return res.status(200).json({ ok: true, status: updatedOrder.status, emailSent });
}
