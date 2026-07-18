import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Vercel Serverless Function: sends each submitted Wonder Ad Lab order to the owner.
// Set RESEND_API_KEY and MAIL_FROM in the deployment environment before going live.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id, service, email, wechat, idea, size, style, payment, date, price } = req.body || {};
  if (!id || !service || !email || !idea) return res.status(400).json({ error: 'Missing order details' });
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return res.status(503).json({ error: 'Email service is not configured' });
  const servicePrices = { '社媒封面': '¥4 / 张', '营销海报': '¥4 / 张', '电商商品图': '¥4 / 张', 'PPT 美化': '¥7.5 / 页', 'AI 快速配图': '¥0.3 / 张', '品牌 Logo': '¥11.5 / 个', 'Banner 设计': '¥3 / 张', '创意字贴': '¥3 / 张', '壁纸设计': '¥4 / 张', '其他需求': 'AI 评估报价（审核后确认）' };
  const orderPrice = servicePrices[service] || price || '待确认报价';
  const text = `新创意订单\n\n订单号：${id}\n服务：${service}\n本次应付项目价格：${orderPrice}\n客户邮箱：${email}\n客户微信：${wechat || '未填写'}\n尺寸：${size}\n风格：${style}\n支付方式：${payment}\n提交时间：${date}\n\n需求：\n${idea}`;
  const ownerResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: ['wonder07090518@gmail.com'], subject: `Wonder Ad Lab 新创意订单 ${id}`, text, reply_to: email })
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
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject: `Wonder Ad Lab 已收到你的订单 ${id}`, text: `你好，\n\n我们已收到你的 ${service} 订单，当前状态为：已提交，正在审核中。\n订单号：${id}\n本次应付项目价格：${orderPrice}\n尺寸：${size}\n风格：${style}\n支付方式：${payment}\n\n请使用附件中的${qrLabel}完成付款。付款后请等待 Wonder Ad Lab 团队确认。作品完成后会通过邮件发送给你。\n\nWonder Ad Lab`, attachments: [{ filename: `${qrLabel}.jpg`, content: qrContent }] })
  });
  if (!ownerResponse.ok || !customerResponse.ok) return res.status(502).json({ error: 'Email delivery failed' });
  return res.status(200).json({ ok: true });
}
