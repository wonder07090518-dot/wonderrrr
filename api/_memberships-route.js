import { isAdmin, kv, storageConfigured } from './_admin.js';
import { getCurrentUser } from './_user.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const membershipMethods = new Set(['微信支付', '支付宝']);

export const membershipPlans = new Map([
  ['monthly', { name: '月会员', amount: 29, durationDays: 30 }],
  ['yearly', { name: '年会员', amount: 199, durationDays: 365 }]
]);

export const membershipActivationScript = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return {0, tonumber(redis.call('GET', KEYS[2]) or '0')}
end
local now = tonumber(ARGV[1])
local duration = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
local starts = current > now and current or now
local expires = starts + duration
redis.call('SET', KEYS[1], ARGV[3])
redis.call('SET', KEYS[2], expires)
return {1, expires}
`;

function requestKey(id) { return `wonder:membership-request:${String(id || '').trim()}`; }
function expiryKey(email) { return `wonder:membership-expiry:${String(email || '').trim().toLowerCase()}`; }
async function loadRequest(id) {
  const raw = await kv('get', requestKey(id));
  return raw ? JSON.parse(raw) : null;
}

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
    subject: `Wonder Ad Lab 会员付款待核对 · ${item.id}`,
    text: `客户已提交会员付款确认。请先在 ${item.payment} 中核对实际到账，再到管理后台确认生效。\n\n会员编号：${item.id}\n客户邮箱：${item.email}\n方案：${item.planName}\n应付金额：¥${item.amount}\n支付方式：${item.payment}`,
    idempotencyKey: `membership-owner-${item.id}`
  });
}

async function notifyCustomer(item) {
  return sendEmail({
    to: item.email,
    replyTo: OWNER_EMAIL,
    subject: `Wonder Ad Lab 会员已生效 · ${item.id}`,
    text: `你好，\n\n你的会员付款已经核对到账，${item.planName}现已生效。\n\n会员编号：${item.id}\n实付金额：¥${item.amount}\n有效期至：${new Date(item.expiresAt).toLocaleDateString('zh-CN', { timeZone: 'America/Toronto' })}\n\nWonder Ad Lab`,
    idempotencyKey: `membership-customer-${item.id}`
  });
}

async function rateLimit(email) {
  const key = `wonder:membership-rate:${email}:${new Date().toISOString().slice(0, 10)}`;
  const count = Number(await kv('incr', key));
  if (count === 1) await kv('expire', key, 86400);
  return count <= 10;
}

export default async function membershipsHandler(req, res) {
  if (!storageConfigured()) return res.status(503).json({ error: 'Membership storage is not configured', setup: true });

  if (req.method === 'POST') {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in before confirming a membership payment' });
    const id = String(req.body?.id || '').trim().slice(0, 32);
    const plan = String(req.body?.plan || '').trim();
    const payment = String(req.body?.payment || '').trim();
    const planDetails = membershipPlans.get(plan);
    if (!/^MB\d{7,16}$/.test(id) || !planDetails || !membershipMethods.has(payment)) return res.status(400).json({ error: 'Invalid membership details' });

    const existing = await loadRequest(id);
    if (existing) {
      if (String(existing.email).toLowerCase() !== user.email || existing.plan !== plan || existing.payment !== payment) return res.status(409).json({ error: 'This membership ID is already in use' });
      let emailSent = Boolean(existing.ownerEmailSent);
      if (!emailSent) {
        try { emailSent = await notifyOwner(existing); } catch { emailSent = false; }
        if (emailSent) await kv('set', requestKey(id), JSON.stringify({ ...existing, ownerEmailSent: true }));
      }
      return res.status(200).json({ ok: true, status: existing.status, amount: existing.amount, emailSent });
    }

    if (!(await rateLimit(user.email))) return res.status(429).json({ error: 'Too many membership requests. Please try again later.' });
    const item = {
      id, email: user.email, name: user.name, plan,
      planName: planDetails.name, amount: planDetails.amount,
      durationDays: planDetails.durationDays, payment,
      currency: 'CNY', status: '待核对',
      requestedAt: new Date().toISOString(),
      ownerEmailSent: false, customerEmailSent: false
    };
    await kv('set', requestKey(id), JSON.stringify(item));
    await kv('zadd', 'wonder:membership-requests', Date.now(), id);
    let emailSent = false;
    try { emailSent = await notifyOwner(item); } catch { emailSent = false; }
    if (emailSent) await kv('set', requestKey(id), JSON.stringify({ ...item, ownerEmailSent: true }));
    return res.status(201).json({ ok: true, status: item.status, amount: item.amount, emailSent });
  }

  if (req.method === 'GET') {
    const ids = await kv('zrevrange', 'wonder:membership-requests', 0, 199);
    const items = (await Promise.all((ids || []).map(loadRequest))).filter(Boolean);
    if (isAdmin(req)) return res.status(200).json({ memberships: items });
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in to view memberships' });
    const memberships = items.filter(item => String(item.email).toLowerCase() === user.email).slice(0, 10);
    return res.status(200).json({ memberships, expiresAt: Number(await kv('get', expiryKey(user.email))) || 0 });
  }

  if (req.method === 'PUT') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
    const id = String(req.body?.id || '').trim().slice(0, 32);
    const action = String(req.body?.action || '');
    if (!/^MB\d{7,16}$/.test(id) || action !== 'approve') return res.status(400).json({ error: 'Invalid approval request' });
    const item = await loadRequest(id);
    if (!item) return res.status(404).json({ error: 'Membership request not found' });
    const planDetails = membershipPlans.get(item.plan);
    if (!planDetails || item.amount !== planDetails.amount) return res.status(409).json({ error: 'Membership plan details do not match' });

    if (item.status === '已生效') {
      let emailSent = Boolean(item.customerEmailSent);
      if (!emailSent) {
        try { emailSent = await notifyCustomer(item); } catch { emailSent = false; }
        if (emailSent) await kv('set', requestKey(id), JSON.stringify({ ...item, customerEmailSent: true }));
      }
      return res.status(200).json({ ok: true, status: item.status, expiresAt: item.expiresAt, emailSent, alreadyApproved: true });
    }

    const now = Date.now();
    const durationMs = planDetails.durationDays * 24 * 60 * 60 * 1000;
    const result = await kv('eval', membershipActivationScript, 2, `wonder:membership-applied:${id}`, expiryKey(item.email), now, durationMs, id);
    const expiresAtMs = Number(result?.[1]);
    if (!expiresAtMs) return res.status(503).json({ error: 'Membership activation could not be completed' });
    const updated = { ...item, status: '已生效', approvedAt: new Date(now).toISOString(), expiresAt: new Date(expiresAtMs).toISOString() };
    await kv('set', requestKey(id), JSON.stringify(updated));
    let emailSent = false;
    try { emailSent = await notifyCustomer(updated); } catch { emailSent = false; }
    if (emailSent) await kv('set', requestKey(id), JSON.stringify({ ...updated, customerEmailSent: true }));
    return res.status(200).json({ ok: true, status: updated.status, expiresAt: updated.expiresAt, emailSent, alreadyApproved: Number(result?.[0]) === 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
