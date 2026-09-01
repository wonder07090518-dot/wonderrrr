import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { kv } from './_admin.js';
import { servicePrices } from './_catalog.js';
import { getCurrentUser } from './_user.js';

// Vercel Serverless Function: sends each submitted Wonder Ad Lab order to the owner.
// Set RESEND_API_KEY and MAIL_FROM in the deployment environment before going live.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const id = String(req.body?.id || '').trim().slice(0, 40);
  if (!id) return res.status(400).json({ error: 'Missing order details' });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in before sending an order email' });
  const storedRaw = await kv('get', `wonder:order:${id}`);
  if (!storedRaw) return res.status(404).json({ error: 'Order not found' });
  const storedOrder = JSON.parse(storedRaw);
  if (String(storedOrder.email).toLowerCase() !== user.email) return res.status(403).json({ error: 'This order does not belong to your account' });
  const { service, email, wechat, idea, size, style, payment, date, price } = storedOrder;
  if (!servicePrices[service] || !email || !idea || !['微信支付', '支付宝'].includes(payment)) return res.status(400).json({ error: 'Invalid order details' });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email service is not configured' });
  const references = Array.isArray(storedOrder.referenceFiles) ? storedOrder.referenceFiles : [];
  const orderPrice = servicePrices[service] || price || '待确认报价';
  const referenceText = references.length ? `\n\n参考文件（共 ${references.length} 个，已安全存入私有空间）：\n${references.map(item => `- ${item.path || item.name}`).join('\n')}\n\n请登录 Wonder Ad Lab 管理后台生成短时下载链接。` : '\n\n参考文件：未上传';
  const text = `新创意订单\n\n订单号：${id}\n服务：${service}\n本次应付项目价格：${orderPrice}\n客户邮箱：${email}\n客户微信：${wechat || '未填写'}\n尺寸：${size}\n风格：${style}\n支付方式：${payment}\n提交时间：${date}\n\n需求：\n${idea}${referenceText}`;
  const ownerPayload = { from: process.env.MAIL_FROM, to: ['wonder07090518@gmail.com'], subject: `Wonder Ad Lab 新创意订单 ${id}`, text, reply_to: email };
  const ownerResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-owner-${id}` },
    body: JSON.stringify(ownerPayload)
  });
  const qrFile = payment === '支付宝' ? 'alipay.jpg' : 'wechat.jpg';
  const qrLabel = payment === '支付宝' ? '支付宝收款码' : '微信支付收款码';
  let qrContent;
  try {
    qrContent = (await readFile(join(process.cwd(), 'public', 'payment', qrFile))).toString('base64');
  } catch {
    // Compatibility with the current GitHub upload, where payment images are at the repository root.
    qrContent = (await readFile(join(process.cwd(), qrFile))).toString('base64');
  }
  const customerResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-customer-${id}` },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: `Wonder Ad Lab 已收到你的订单 ${id}`, text: `你好，\n\n我们已收到你的 ${service} 订单，当前状态为：已提交，正在审核中。\n订单号：${id}\n本次应付项目价格：${orderPrice}\n尺寸：${size}\n风格：${style}\n支付方式：${payment}\n参考文件：${references.length ? `已安全保存 ${references.length} 个` : '未上传'}\n\n请使用附件中的${qrLabel}完成付款。付款后请等待 Wonder Ad Lab 团队确认。作品完成后会通过邮件发送给你。\n\nWonder Ad Lab`, reply_to: 'wonder07090518@gmail.com', attachments: [{ filename: `${qrLabel}.jpg`, content: qrContent }] })
  });
  if (!ownerResponse.ok || !customerResponse.ok) return res.status(502).json({ error: 'Email delivery failed' });
  return res.status(200).json({ ok: true });
}
