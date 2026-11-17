import { randomBytes } from 'node:crypto';
const packages = { Trial: 'US$19', Standard: 'US$59', Complete: 'US$129' };
const platforms = new Set(['Amazon', 'Etsy', 'Shopify', 'Other']);
const attempts = new Map();
const windowMs = 5 * 60 * 1000;
const terms = 'This is an inquiry only, not a payment. If accepted, Wonder Lab will send a PayPal invoice (Goods & Services). Work starts only after payment is confirmed. Please do not use Friends & Family.';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Please submit the inquiry form using POST.' }); }
  let body = req.body;
  try {
    if (typeof body === 'string') body = req.headers?.['content-type']?.includes('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(body)) : JSON.parse(body);
  } catch { return res.status(400).json({ error: 'Please check the inquiry fields and try again.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Please complete the inquiry form.' });
  if (body.website) return res.status(400).json({ error: 'Unable to accept this inquiry.' });
  const limits = { email: 254, name: 100, platform: 20, package: 20, product: 500, notes: 3000, photoLink: 1000 };
  const data = {};
  for (const [key, max] of Object.entries(limits)) {
    if (body[key] !== undefined && typeof body[key] !== 'string') return res.status(400).json({ error: 'Please use text in the inquiry fields.' });
    data[key] = (body[key] || '').trim();
    if (data[key].length > max || (key !== 'notes' && /[\r\n\x00]/.test(data[key]))) return res.status(400).json({ error: 'A field is too long or contains invalid characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !data.product || !platforms.has(data.platform) || !Object.hasOwn(packages, data.package) || body.acknowledged !== 'yes') return res.status(400).json({ error: 'Please check your email, product, platform, package and inquiry acknowledgment.' });
  if (data.photoLink) {
    try { const url = new URL(data.photoLink); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { return res.status(400).json({ error: 'Please provide a valid http or https photo link.' }); }
  }
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email is temporarily unavailable. Please email wonder07090518@gmail.com.' });
  const now = Date.now();
  for (const [key, time] of attempts) if (now - time >= windowMs) attempts.delete(key);
  // Vercel supplies this header. Unknown origins share one bucket: fail closed.
  const ip = String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (attempts.has(ip) || attempts.size >= 10000) return res.status(429).json({ error: 'Please wait five minutes before submitting again, or email the studio.' });
  attempts.set(ip, now); // Reserve before any network call, including failed attempts.
  const id = `WL-${new Date(now).toISOString().slice(0,10).replaceAll('-', '')}-${randomBytes(4).toString('hex').slice(0,4).toUpperCase()}`;
  const owner = `Wonder Lab 新询价：${id}\n邮箱：${data.email}\n姓名：${data.name || '未填写'}\n平台：${data.platform}\n套餐：${data.package} ${packages[data.package]}\n产品链接或名称：${data.product}\n需求：${data.notes || '未填写'}\n参考照片链接：${data.photoLink || '未填写'}\n\n这是询价，不是付款。若接单，工作室将通过 PayPal invoice（Goods & Services，商品与服务）收款；确认到账后才开工。请勿用亲友转账付款。\n客户已确认询价声明。\n\nWonder Lab`;
  const customer = `Hello${data.name ? ` ${data.name}` : ''},\n\nThank you for contacting Wonder Lab. Your inquiry reference is ${id}.\nPlatform: ${data.platform}\nSelected package: ${data.package} — ${packages[data.package]}\n\n${terms}\n\nWe will review your brief and reply by email to confirm whether we can accept the project, the scope and timing. No payment is due now. Please check your inbox and spam folder.\n\nWonder Lab\nwonder07090518@gmail.com`;
  const send = async (to, subject, text, reply_to) => {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${id}-${to === data.email ? 'customer' : 'studio'}` }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], reply_to, subject, text }) });
    if (!response.ok) throw new Error('Email delivery failed');
  };
  try { await send('wonder07090518@gmail.com', `Wonder Lab 新询价 ${id}`, owner, data.email); }
  catch { return res.status(502).json({ error: 'We could not send your inquiry. Please email wonder07090518@gmail.com before trying again.' }); }
  try { await send(data.email, `Wonder Lab inquiry received — ${id}`, customer, 'wonder07090518@gmail.com'); }
  catch { return res.status(200).json({ ok: true, id, confirmationSent: false, message: 'Your inquiry reached the studio, but your confirmation email could not be sent. Keep this reference. Do not pay now.' }); }
  return res.status(200).json({ ok: true, id, confirmationSent: true });
}
