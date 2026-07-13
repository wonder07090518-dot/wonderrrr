export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, message } = req.body || {};
  if (!email || !message) return res.status(400).json({ error: 'Missing contact details' });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email service is not configured' });
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: ['wonder07090518@gmail.com'], reply_to: email, subject: 'Wonder Ad Lab 企业定制咨询', text: `客户邮箱：${email}\n\n定制需求：\n${message}` }) });
  return response.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'Email delivery failed' });
}
