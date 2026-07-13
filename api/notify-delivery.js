import { isAdmin } from './_admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  const { email, orderId, service, price, fileName, fileData } = req.body || {};
  if (!email || !orderId || !fileName || !fileData) return res.status(400).json({ error: 'Missing delivery details' });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email service is not configured' });
  const base64 = String(fileData).replace(/^data:[^;]+;base64,/, '');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: `Wonder Ad Lab 作品已完成 ${orderId}`, text: `你好，\n\n你的订单已完成，成品已作为邮件附件发送。\n订单号：${orderId}${service ? `\n项目：${service}` : ''}${price ? `\n项目价格：${price}` : ''}\n\n感谢选择 Wonder Ad Lab。`, attachments: [{ filename: fileName, content: base64 }] }) });
  return response.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'Delivery email failed' });
}
