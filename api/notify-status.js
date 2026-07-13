import { isAdmin } from './_admin.js';

const messages = {
  '审核中': '你的订单已进入审核中。我们会确认需求与付款信息，并尽快安排制作。',
  '制作中': '你的订单已进入制作中。设计师正在根据你的需求完成作品，完成后会通过邮件交付。'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  const { email, orderId, service, price, status } = req.body || {};
  if (!email || !orderId || !messages[status]) return res.status(400).json({ error: 'Missing status details' });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email service is not configured' });
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: `Wonder Ad Lab 订单进度更新 · ${status}`, text: `你好，\n\n${messages[status]}\n\n订单号：${orderId}${service ? `\n项目：${service}` : ''}${price ? `\n项目价格：${price}` : ''}\n当前状态：${status}\n\nWonder Ad Lab` }) });
  return response.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'Status email failed' });
}
