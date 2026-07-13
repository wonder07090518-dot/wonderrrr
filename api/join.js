export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, organization, role, message } = req.body || {};
  if (!email || !organization || !role || !message) return res.status(400).json({ error: 'Missing application details' });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email service is not configured' });
  const owner = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: ['wonder07090518@gmail.com'], reply_to: email, subject: `Wonder Ad Lab 加入申请 · ${role}`, text: `申请邮箱：${email}\n学校 / 公司：${organization}\n方向：${role}\n\n介绍：\n${message}` }) });
  const applicant = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: 'Wonder Ad Lab 已收到你的加入申请', text: `你好，\n\n我们已收到你关于「${role}」的加入申请。团队会通过此邮箱联系你。\n\nWonder Ad Lab` }) });
  return owner.ok && applicant.ok ? res.status(200).json({ ok: true }) : res.status(502).json({ error: 'Email delivery failed' });
}
