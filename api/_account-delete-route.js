import { scryptSync, timingSafeEqual } from 'node:crypto';
import { del as deleteBlob } from '@vercel/blob';
import { kv, storageConfigured } from './_admin.js';
import { clearUserSession, getCurrentUser, userConfigured, userKey } from './_user.js';
import { balanceKey, balancePaymentKey, rechargeKey } from './_balance.js';
import {
  AppleAuthError,
  appleIdentityKey,
  encryptAppleRefreshToken,
  exchangeAppleAuthorization,
  revokeAppleRefreshToken
} from './_apple-auth.js';

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('base64');
}

function passwordMatches(password, user) {
  try {
    if (!user?.passwordHash || !user?.passwordSalt) return false;
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
  if (req.body?.confirmation !== 'DELETE') return res.status(400).json({ error: 'Account deletion confirmation is required' });

  const stored = await kv('get', userKey(current.email));
  const user = stored ? JSON.parse(stored) : null;
  if (!user) return res.status(401).json({ error: '登录状态已失效，请重新登录' });
  if (user.passwordHash && user.passwordSalt) {
    if (typeof req.body?.password !== 'string' || !passwordMatches(req.body.password, user)) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }
  } else if (user.appleSub) {
    try {
      const authorization = req.body?.appleAuthorization || {};
      const apple = await exchangeAppleAuthorization({
        authorizationCode: authorization.authorizationCode,
        rawNonce: authorization.rawNonce
      });
      if (apple.sub !== user.appleSub) return res.status(401).json({ error: '请使用当前账户关联的 Apple 账户确认注销' });
      if (apple.refreshToken) user.appleRefreshToken = encryptAppleRefreshToken(apple.refreshToken);
    } catch (error) {
      if (error instanceof AppleAuthError) return res.status(error.status).json({ error: error.message, code: error.code });
      return res.status(401).json({ error: 'Apple 账户确认失败，请重新尝试' });
    }
  } else {
    return res.status(409).json({ error: '这个账户没有可用的重新验证方式，请联系支持' });
  }

  if (user.appleRefreshToken) {
    try { await revokeAppleRefreshToken(user.appleRefreshToken); }
    catch (error) {
      if (error instanceof AppleAuthError) return res.status(error.status).json({ error: error.message, code: error.code });
      return res.status(502).json({ error: 'Apple 授权未能撤销，请稍后再试' });
    }
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
    kv('del', userKey(normalizedEmail)),
    ...(user.appleSub ? [kv('del', appleIdentityKey(user.appleSub))] : [])
  ]);
  clearUserSession(res);
  return res.status(200).json({ ok: true, deleted: { orders: orders.length, recharges: recharges.length, feedback: feedback.length, files: blobPathnames.length } });
}
