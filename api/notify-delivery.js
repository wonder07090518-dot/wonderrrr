import { isAdmin, kv } from './_admin.js';
import { createHash } from 'node:crypto';
import { paymentEvidence } from './_order-policy.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  const { orderId, fileName, fileData, approved } = req.body || {};
  if (!orderId || !fileName || !fileData) return res.status(400).json({ error: 'Missing delivery details' });
  if (approved !== true) return res.status(409).json({ error: 'Wonder approval is required before delivery' });
  const storedRaw = await kv('get', `wonder:order:${String(orderId).trim().slice(0, 40)}`);
  if (!storedRaw) return res.status(404).json({ error: 'Order not found' });
  const order = JSON.parse(storedRaw);
  if (order.isTest === true || order.testCreditUsed === true) return res.status(409).json({ error: 'Test orders cannot be delivered' });
  if (!paymentEvidence(order) || !['已支付', '制作中', '修改申请', '修改中'].includes(order.status)) return res.status(409).json({ error: 'Payment must be verified before delivery' });
  const { email, service, price } = order;
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email service is not configured' });
  const base64 = String(fileData).replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) return res.status(413).json({ error: 'Delivery file must be between 1 byte and 3 MB' });
  const safeFileName = String(fileName).trim().slice(0, 120).replace(/[\\/\r\n\0]/g, '-');
  if (!safeFileName) return res.status(400).json({ error: 'Invalid delivery file name' });
  const digest = createHash('sha256').update(bytes).digest('hex');
  const now = new Date().toISOString();
  const approvedOrder = { ...order, deliveryApprovedAt: now, deliveryApprovedBy: 'admin-dashboard', deliveryApprovedFileName: safeFileName, deliveryApprovedFileSHA256: digest, updatedAt: now };
  await kv('set', `wonder:order:${String(orderId).trim().slice(0, 40)}`, JSON.stringify(approvedOrder));
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `delivery-${order.id}-${digest.slice(0, 20)}` }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: `Wonder Ad Lab 作品已完成 ${orderId}`, text: `你好，\n\n你的订单已完成，成品已作为邮件附件发送。\n订单号：${orderId}${service ? `\n项目：${service}` : ''}${price ? `\n项目价格：${price}` : ''}\n\n如需调整，可登录 Wonder Ad Lab，在“我的订单”中提交修改申请；也可以直接回复这封邮件。\n\n感谢选择 Wonder Ad Lab。`, reply_to: 'wonder07090518@gmail.com', attachments: [{ filename: safeFileName, content: base64 }] }) });
  const latestRaw = await kv('get', `wonder:order:${String(orderId).trim().slice(0, 40)}`);
  const latest = latestRaw ? JSON.parse(latestRaw) : approvedOrder;
  const deliveryResult = response.ok
    ? { deliveryEmailSentAt: new Date().toISOString(), deliveryEmailFailedAt: null }
    : { deliveryEmailFailedAt: new Date().toISOString() };
  await kv('set', `wonder:order:${String(orderId).trim().slice(0, 40)}`, JSON.stringify({ ...latest, ...deliveryResult, updatedAt: new Date().toISOString() }));
  return response.ok ? res.status(200).json({ ok: true, approvedAt: now }) : res.status(502).json({ error: 'Delivery email failed' });
}
