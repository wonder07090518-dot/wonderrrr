import { kv, storageConfigured } from './_admin.js';
import { balanceKey, balancePaymentKey } from './_balance.js';
import { servicePrices } from './_catalog.js';
import { getCurrentUser } from './_user.js';

export const balanceDebitScript = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if redis.call('EXISTS', KEYS[2]) == 1 then
  return {2, current}
end
local amount = tonumber(ARGV[1])
if not amount or amount <= 0 or current < amount then
  return {0, current}
end
local remaining = redis.call('DECRBY', KEYS[1], amount)
redis.call('SET', KEYS[2], ARGV[2])
return {1, remaining}
`;

export function catalogAmount(price) {
  const match = String(price || '').match(/^¥\s*(\d+)\b/);
  return match ? Number(match[1]) : 0;
}

async function sendBalanceReceipt(order, amount, balanceAfter) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const referenceCount = Array.isArray(order.referenceFiles) ? order.referenceFiles.length : 0;
  const customerText = `你好，\n\n订单 ${order.id} 已使用账户余额支付成功。\n服务：${order.service}\n扣款金额：¥${amount}\n剩余余额：¥${balanceAfter}\n订单状态：已支付\n参考文件：${referenceCount ? `已安全保存 ${referenceCount} 个` : '未上传'}\n\n我们会开始处理订单，完成后通过邮件交付。\n\nWonder Ad Lab`;
  const ownerText = `余额支付订单\n\n订单号：${order.id}\n客户邮箱：${order.email}\n服务：${order.service}\n扣款金额：¥${amount}\n客户剩余余额：¥${balanceAfter}\n尺寸：${order.size}\n风格：${order.style}\n需求：${order.idea}\n参考文件：${referenceCount} 个`;
  try {
    const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
    const [customer, owner] = await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': `balance-payment-customer-${order.id}` },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to: [order.email], subject: `Wonder Ad Lab 余额支付成功 ${order.id}`, text: customerText, reply_to: 'wonder07090518@gmail.com' })
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': `balance-payment-owner-${order.id}` },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to: ['wonder07090518@gmail.com'], subject: `Wonder Ad Lab 余额支付订单 ${order.id}`, text: ownerText, reply_to: order.email })
      })
    ]);
    return customer.ok && owner.ok;
  } catch {
    return false;
  }
}

export default async function balancePaymentHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Balance storage is not configured', setup: true });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in before using your balance' });
  const orderId = String(req.body?.orderId || '').trim().slice(0, 40);
  if (!orderId) return res.status(400).json({ error: 'Missing order number' });
  const orderKey = `wonder:order:${orderId}`;
  const storedRaw = await kv('get', orderKey);
  if (!storedRaw) return res.status(404).json({ error: 'Order not found' });
  const order = JSON.parse(storedRaw);
  if (String(order.email || '').trim().toLowerCase() !== user.email) return res.status(403).json({ error: 'This order does not belong to your account' });

  const price = servicePrices[order.service];
  const amount = catalogAmount(price);
  if (!amount) return res.status(409).json({ error: 'This project needs a confirmed fixed quote before balance payment' });
  if (order.status === '已支付' && order.payment === '余额支付') {
    return res.status(200).json({ ok: true, alreadyPaid: true, amount, balance: Number(order.balanceAfter) || 0, order: { id: order.id, service: order.service, price: order.price, payment: order.payment, status: order.status, amountPaid: order.amountPaid, balanceAfter: order.balanceAfter } });
  }
  if (!['审核中', '待支付', '待确认支付'].includes(order.status)) return res.status(409).json({ error: 'This order cannot be paid again' });

  const result = await kv('eval', balanceDebitScript, 2, balanceKey(user.email), balancePaymentKey(orderId), amount, orderId);
  const code = Number(result?.[0]);
  const balanceAfter = Math.max(0, Number(result?.[1]) || 0);
  if (code === 0) return res.status(402).json({ error: 'Insufficient balance', balance: balanceAfter, required: amount });
  if (![1, 2].includes(code)) return res.status(503).json({ error: 'Balance payment could not be completed' });

  const paidOrder = { ...order, price, payment: '余额支付', status: '已支付', amountPaid: amount, balanceAfter, paidAt: order.paidAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  await kv('set', orderKey, JSON.stringify(paidOrder));
  const emailSent = await sendBalanceReceipt(paidOrder, amount, balanceAfter);
  return res.status(200).json({ ok: true, alreadyPaid: code === 2, amount, balance: balanceAfter, emailSent, order: { id: paidOrder.id, service: paidOrder.service, price: paidOrder.price, payment: paidOrder.payment, status: paidOrder.status, amountPaid: paidOrder.amountPaid, balanceAfter: paidOrder.balanceAfter } });
}
