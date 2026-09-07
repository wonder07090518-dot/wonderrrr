import { kv } from './_admin.js';
import {
  AppleAuthError,
  appleAuthConfigured,
  appleIdentityKey,
  encryptAppleRefreshToken,
  exchangeAppleAuthorization,
  normalizedAppleName
} from './_apple-auth.js';
import { getCurrentUser, issueUserSession, safeUser, userConfigured, userKey } from './_user.js';

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function sendFailure(res, error) {
  if (error instanceof AppleAuthError) return res.status(error.status).json({ error: error.message, code: error.code });
  return res.status(500).json({ error: 'Apple 登录暂时无法使用，请稍后重试', code: 'apple_auth_failed' });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ enabled: appleAuthConfigured() && userConfigured() });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!appleAuthConfigured() || !userConfigured()) return res.status(503).json({ error: 'Apple 登录仍在配置中，请先使用邮箱登录', code: 'apple_auth_not_configured' });

  const { action = 'login', authorizationCode, rawNonce, name } = req.body || {};
  if (!['login', 'link'].includes(action)) return res.status(400).json({ error: 'Invalid account action' });

  try {
    const apple = await exchangeAppleAuthorization({ authorizationCode, rawNonce });
    const mappingKey = appleIdentityKey(apple.sub);
    const mappedEmail = await kv('get', mappingKey);

    if (action === 'link') {
      const current = await getCurrentUser(req);
      if (!current) return res.status(401).json({ error: '请先使用现有邮箱账户登录，再关联 Apple 账户', code: 'sign_in_required' });
      if (mappedEmail && String(mappedEmail).toLowerCase() !== current.email) {
        return res.status(409).json({ error: '这个 Apple 账户已经关联了另一个 Wonder 账户', code: 'apple_already_linked' });
      }
      const raw = await kv('get', userKey(current.email));
      if (!raw) return res.status(401).json({ error: '登录状态已失效，请重新登录' });
      const user = JSON.parse(raw);
      user.appleSub = apple.sub;
      user.applePrivateEmail = apple.privateEmail;
      if (apple.refreshToken) user.appleRefreshToken = encryptAppleRefreshToken(apple.refreshToken);
      await kv('set', userKey(current.email), JSON.stringify(user));
      await kv('set', mappingKey, current.email);
      issueUserSession(res, user);
      return res.status(200).json({ ok: true, user: safeUser(user) });
    }

    if (mappedEmail) {
      const raw = await kv('get', userKey(mappedEmail));
      if (!raw) return res.status(409).json({ error: 'Apple 账户关联记录需要支持人员修复', code: 'apple_mapping_orphaned' });
      const user = JSON.parse(raw);
      if (user.appleSub !== apple.sub) return res.status(409).json({ error: 'Apple 账户关联不一致，请联系支持', code: 'apple_mapping_mismatch' });
      if (apple.refreshToken) {
        user.appleRefreshToken = encryptAppleRefreshToken(apple.refreshToken);
        await kv('set', userKey(user.email), JSON.stringify(user));
      }
      issueUserSession(res, user);
      return res.status(200).json({ ok: true, user: safeUser(user) });
    }

    if (!apple.email || !apple.emailVerified || !validEmail(apple.email)) {
      return res.status(409).json({ error: '首次使用 Apple 登录时需要提供经过验证的邮箱', code: 'verified_email_required' });
    }
    const existing = await kv('get', userKey(apple.email));
    if (existing) {
      return res.status(409).json({
        error: '这个邮箱已有 Wonder 账户。请先用邮箱密码登录，再在账户页面关联 Apple 账户',
        code: 'account_link_required'
      });
    }
    if (!apple.refreshToken) return res.status(502).json({ error: 'Apple 未返回完整授权信息，请重新登录', code: 'apple_refresh_token_missing' });

    const user = {
      email: apple.email,
      name: normalizedAppleName(name),
      provider: 'apple',
      appleSub: apple.sub,
      applePrivateEmail: apple.privateEmail,
      appleRefreshToken: encryptAppleRefreshToken(apple.refreshToken),
      createdAt: new Date().toISOString()
    };
    await kv('set', userKey(user.email), JSON.stringify(user));
    await kv('set', mappingKey, user.email);
    issueUserSession(res, user);
    return res.status(201).json({ ok: true, user: safeUser(user) });
  } catch (error) {
    return sendFailure(res, error);
  }
}
