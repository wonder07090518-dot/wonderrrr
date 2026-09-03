import { scryptSync, timingSafeEqual } from 'node:crypto';
import { del as deleteBlob } from '@vercel/blob';
import { kv, storageConfigured } from './_admin.js';
import { clearUserSession, getCurrentUser, userConfigured, userKey } from './_user.js';
import { balanceKey, balancePaymentKey, rechargeKey } from './_balance.js';

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('base64');
}

function passwordMatches(password, user) {
  try {
    const expected = Buffer.from(user.passwordHash, 'base64');
    const received = Buffer.from(hashPassword(password, user.passwordSalt), 'base64');
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

async function recordsFromIndex(index, prefix) {
  const ids = await kv('zrevrange', index, 0, -1);
  const rows = await Promise.all((ids || []).map(async id => {
    const raw = await kv('get', `${prefix}${id}`);
    return raw ? { id, value: JSON.parse(raw) } : null;
  }));
  return rows.filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured() || !userConfigured()) return res.status(503).json({ error: 'Account service is not configured' });

  const current = await getCurrentUser(req);
  if (!current) return res.status(401).json({ error: 'Please sign in before deleting your account' });
  if (req.body?.confirmation !== 'DELETE' || typeof req.body?.password !== 'string') {
    return res.status(400).json({ error: 'Password confirmation is required' });
  }

  const stored = await kv('get', userKey(current.email));
  const user = stored ? JSON.parse(stored) : null;
  if (!user || !passwordMatches(req.body.password, user)) {
    return res.status(401).json({ error: 'Password is incorrect' });
  }

  const normalizedEmail = current.email.toLowerCase();
  const orders = (await recordsFromIndex('wonder:orders', 'wonder:order:'))
    .filter(row => String(row.value?.email || '').toLowerCase() === normalizedEmail);
  const recharges = (await recordsFromIndex('wonder:recharges', 'wonder:recharge:'))
    .filter(row => String(row.value?.email || '').toLowerCase() === normalizedEmail);
  const feedback = (await recordsFromIndex('wonder:feedback', 'wonder:feedback:'))
    .filter(row => String(row.value?.email || '').toLowerCase() === normalizedEmail);

  const blobPathnames = orders.flatMap(row => Array.isArray(row.value?.referenceFiles)
    ? row.value.referenceFiles.map(file => file?.blobPathname).filter(Boolean)
    : []);
  if (blobPathnames.length) {
    try { await deleteBlob(blobPathnames); }
    catch { return res.status(502).json({ error: 'Private files could not be deleted. Please try again.' }); }
  }

  for (const row of orders) {
    const revisions = Array.isArray(row.value?.revisions) ? row.value.revisions : [];
    await Promise.all([
      kv('del', `wonder:order:${row.id}`),
      kv('zrem', 'wonder:orders', row.id),
      kv('del', balancePaymentKey(row.id)),
      ...revisions.map(revision => kv('zrem', 'wonder:revisions', `${row.id}:${revision.id}`))
    ]);
  }

  for (const row of recharges) {
    await Promise.all([
      kv('del', rechargeKey(row.id)),
      kv('del', `wonder:recharge-applied:${row.id}`),
      kv('zrem', 'wonder:recharges', row.id)
    ]);
  }

  for (const row of feedback) {
    await Promise.all([
      kv('del', `wonder:feedback:${row.id}`),
      kv('zrem', 'wonder:feedback', row.id)
    ]);
  }

  await Promise.all([
    kv('del', balanceKey(normalizedEmail)),
    kv('del', userKey(normalizedEmail))
  ]);
  clearUserSession(res);
  return res.status(200).json({ ok: true, deleted: { orders: orders.length, recharges: recharges.length, feedback: feedback.length, files: blobPathnames.length } });
}
