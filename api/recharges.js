import { isAdmin, kv, storageConfigured } from './_admin.js';
import { getCurrentUser } from './_user.js';
import { balanceKey, loadRecharge, readBalance, rechargeAmounts, rechargeKey, rechargeMethods } from './_balance.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';

async function sendEmail({ to, replyTo, subject, text, idempotencyKey }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], reply_to: replyTo, subject, text })
  });
  return response.ok;
}

async function notifyOwner(item) {
  return sendEmail({
    to: OWNER_EMAIL,
    replyTo: item.email,
    subject: `Wonder Ad Lab 余额充值待核对 · ${item.id}`,
    text: `客户已提交充值付款确认。请先核对实际到账，再在管理后台点击“确认到账并入账”。\n\n充值编号：${item.id}\n客户邮箱：${item.email}\n支付方式：${item.payment}\n付款金额：¥${item.amount}\n待入余额：¥${item.creditedAmount}`,
    idempotencyKey: `recharge-owner-${item.id}`
  });
}

async function notifyCustomer(item, balance) {
  return sendEmail({
    to: item.email,
    replyTo: OWNER_EMAIL,
    subject: `Wonder Ad Lab 余额已到账 · ${item.id}`,
    text: `你好，\n\n你的充值已经核对到账，并已按 1:1 计入 Wonder Ad Lab 账户余额。\n\n充值编号：${item.id}\n充值金额：¥${item.amount}\n到账余额：¥${item.creditedAmount}\n当前余额：¥${balance}\n\nWonder Ad Lab`,
    idempotencyKey: `recharge-customer-${item.id}`
  });
}

export default async function handler(req, res) {
  if (!storageConfigured()) return res.status(503).json({ error: 'Recharge storage is not configured', setup: true });

  if (req.method === 'POST') {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in before confirming a top-up' });
    const id = String(req.body?.id || '').trim().slice(0, 32);
    const amount = Number(req.body?.amount);
    const payment = String(req.body?.payment || '').trim();
    if (!/^RC\d{7,16}$/.test(id) || !rechargeAmounts.has(amount) || !rechargeMethods.has(payment)) return res.status(400).json({ error: 'Invalid top-up details' });
    const existing = await loadRecharge(id);
    if (existing) {
      if (String(existing.email).toLowerCase() !== user.email) return res.status(409).json({ error: 'This top-up ID is already in use' });
      if (Number(existing.amount) !== amount || existing.payment !== payment) return res.status(409).json({ error: 'This top-up ID does not match the original payment details' });
      let emailSent = Boolean(existing.ownerEmailSent);
      if (!emailSent) {
        try { emailSent = await notifyOwner(existing); } catch { emailSent = false; }
        if (emailSent) await kv('set', rechargeKey(id), JSON.stringify({ ...existing, ownerEmailSent: true }));
      }
      return res.status(200).json({ ok: true, status: existing.status, emailSent });
    }
    const item = { id, email: user.email, name: user.name, amount, creditedAmount: amount, payment, currency: 'CNY', status: '待确认支付', requestedAt: new Date().toISOString(), ownerEmailSent: false };
    await kv('set', rechargeKey(id), JSON.stringify(item));
    await kv('zadd', 'wonder:recharges', Date.now(), id);
    let emailSent = false;
    try { emailSent = await notifyOwner(item); } catch { emailSent = false; }
    if (emailSent) await kv('set', rechargeKey(id), JSON.stringify({ ...item, ownerEmailSent: true }));
    return res.status(201).json({ ok: true, status: item.status, emailSent });
  }

  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });

  if (req.method === 'GET') {
    const ids = await kv('zrevrange', 'wonder:recharges', 0, 199);
    const recharges = (await Promise.all((ids || []).map(loadRecharge))).filter(Boolean);
    return res.status(200).json({ recharges });
  }

  if (req.method === 'PUT') {
    const id = String(req.body?.id || '').trim().slice(0, 32);
    const action = String(req.body?.action || '');
    if (!/^RC\d{7,16}$/.test(id) || action !== 'approve') return res.status(400).json({ error: 'Invalid approval request' });
    const item = await loadRecharge(id);
    if (!item) return res.status(404).json({ error: 'Top-up not found' });
    let balance = await readBalance(item.email);
    if (item.status !== '已到账') {
      const firstCredit = Number(await kv('setnx', `wonder:recharge-applied:${id}`, item.creditedAmount)) === 1;
      if (firstCredit) balance = Number(await kv('incrby', balanceKey(item.email), item.creditedAmount));
      else balance = await readBalance(item.email);
      const updated = { ...item, status: '已到账', approvedAt: new Date().toISOString(), balanceAfter: balance };
      await kv('set', rechargeKey(id), JSON.stringify(updated));
      let emailSent = false;
      try { emailSent = await notifyCustomer(updated, balance); } catch { emailSent = false; }
      return res.status(200).json({ ok: true, status: updated.status, balance, emailSent });
    }
    return res.status(200).json({ ok: true, status: item.status, balance, emailSent: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
