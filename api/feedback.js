import { createHash, randomBytes } from 'node:crypto';
import { kv, storageConfigured } from './_admin.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const categories = new Set(['功能问题', '设计建议', '服务建议', '其他建议']);

function clean(value, length) {
  return String(value || '').trim().slice(0, length).replace(/\0/g, '');
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function withinRateLimit(req) {
  if (!storageConfigured()) return true;
  const address = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const fingerprint = createHash('sha256').update(`${address}|${req.headers['user-agent'] || ''}`).digest('hex').slice(0, 24);
  const key = `wonder:feedback-rate:${fingerprint}`;
  const count = Number(await kv('incr', key));
  if (count === 1) await kv('expire', key, 3600);
  return count <= 5;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (clean(req.body?.website, 120)) return res.status(200).json({ ok: true });
  const email = clean(req.body?.email, 180).toLowerCase();
  const category = clean(req.body?.category, 40);
  const message = clean(req.body?.message, 2000);
  if (!validEmail(email) || !categories.has(category) || message.length < 10) return res.status(400).json({ error: 'Please provide a valid email, category and suggestion' });
  if (!(await withinRateLimit(req))) return res.status(429).json({ error: 'Too many suggestions. Please try again later.' });
  const id = `FB${Date.now().toString().slice(-9)}${randomBytes(2).toString('hex')}`;
  const item = { id, email, category, message, createdAt: new Date().toISOString() };
  if (storageConfigured()) {
    await kv('set', `wonder:feedback:${id}`, JSON.stringify(item));
    await kv('zadd', 'wonder:feedback', Date.now(), id);
  }
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(201).json({ ok: true, id, emailSent: false });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `feedback-${id}` },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [OWNER_EMAIL], reply_to: email, subject: `Wonder Ad Lab 意见建议 · ${category}`, text: `建议编号：${id}\n联系邮箱：${email}\n类型：${category}\n\n建议内容：\n${message}` })
  });
  return res.status(201).json({ ok: true, id, emailSent: response.ok });
}
