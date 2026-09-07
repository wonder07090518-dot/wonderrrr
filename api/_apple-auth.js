import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  timingSafeEqual,
  verify
} from 'node:crypto';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_AUDIENCE = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';
const CLOCK_SKEW_SECONDS = 60;
const MAX_ID_TOKEN_AGE_SECONDS = 10 * 60;

export class AppleAuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fail(status, code, message) {
  throw new AppleAuthError(status, code, message);
}

function environment(env = process.env) {
  return {
    clientID: String(env.APPLE_CLIENT_ID || '').trim(),
    teamID: String(env.APPLE_TEAM_ID || '').trim(),
    keyID: String(env.APPLE_KEY_ID || '').trim(),
    privateKey: String(env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),
    tokenKey: String(env.APPLE_TOKEN_ENCRYPTION_KEY || env.USER_SESSION_SECRET || '').trim()
  };
}

export function appleAuthConfigured(env = process.env) {
  const config = environment(env);
  return Boolean(config.clientID && config.teamID && config.keyID && config.privateKey && config.tokenKey);
}

export function appleIdentityKey(subject) {
  return `wonder:identity:apple:${createHash('sha256').update(String(subject)).digest('hex')}`;
}

function encode(value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return data.toString('base64url');
}

function decodeJSON(value) {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); }
  catch { fail(401, 'invalid_apple_token', 'Apple 登录凭证无法读取，请重新登录'); }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function truthyClaim(value) {
  return value === true || value === 'true';
}

function expectedNonce(rawNonce) {
  return createHash('sha256').update(rawNonce).digest('hex');
}

function assertAuthorizationInput(authorizationCode, rawNonce) {
  if (typeof authorizationCode !== 'string' || authorizationCode.length < 8 || authorizationCode.length > 4096) {
    fail(400, 'invalid_apple_authorization', 'Apple 授权码无效，请重新登录');
  }
  if (typeof rawNonce !== 'string' || rawNonce.length < 16 || rawNonce.length > 256) {
    fail(400, 'invalid_apple_nonce', 'Apple 登录校验已过期，请重新登录');
  }
}

export function createAppleClientSecret({ env = process.env, now = Date.now() } = {}) {
  const config = environment(env);
  if (!appleAuthConfigured(env)) fail(503, 'apple_auth_not_configured', 'Apple 登录仍在配置中，请先使用邮箱登录');
  const issuedAt = Math.floor(now / 1000);
  const header = encode(JSON.stringify({ alg: 'ES256', kid: config.keyID, typ: 'JWT' }));
  const payload = encode(JSON.stringify({
    iss: config.teamID,
    iat: issuedAt,
    exp: issuedAt + 5 * 60,
    aud: APPLE_AUDIENCE,
    sub: config.clientID
  }));
  const signingInput = `${header}.${payload}`;
  let signature;
  try {
    signature = sign('sha256', Buffer.from(signingInput), {
      key: createPrivateKey(config.privateKey),
      dsaEncoding: 'ieee-p1363'
    });
  } catch {
    fail(503, 'apple_auth_key_invalid', 'Apple 登录密钥配置无效');
  }
  return `${signingInput}.${encode(signature)}`;
}

export function validateAppleIdentityToken(identityToken, {
  rawNonce,
  clientID,
  jwks,
  now = Date.now()
} = {}) {
  if (typeof identityToken !== 'string') fail(401, 'invalid_apple_token', 'Apple 登录凭证无效');
  const pieces = identityToken.split('.');
  if (pieces.length !== 3) fail(401, 'invalid_apple_token', 'Apple 登录凭证无效');
  const [encodedHeader, encodedClaims, encodedSignature] = pieces;
  const header = decodeJSON(encodedHeader);
  const claims = decodeJSON(encodedClaims);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') fail(401, 'invalid_apple_token', 'Apple 登录签名格式无效');
  const key = Array.isArray(jwks?.keys) ? jwks.keys.find(item => item.kid === header.kid && item.kty === 'RSA') : null;
  if (!key) fail(401, 'apple_key_not_found', '暂时无法验证 Apple 登录，请稍后重试');
  let validSignature = false;
  try {
    validSignature = verify(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedClaims}`),
      createPublicKey({ key, format: 'jwk' }),
      Buffer.from(encodedSignature, 'base64url')
    );
  } catch {
    validSignature = false;
  }
  if (!validSignature) fail(401, 'invalid_apple_signature', 'Apple 登录签名验证失败');

  const nowSeconds = Math.floor(now / 1000);
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== APPLE_ISSUER || !audience.includes(clientID)) fail(401, 'invalid_apple_audience', 'Apple 登录凭证不属于此应用');
  if (!Number.isFinite(claims.exp) || claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) fail(401, 'expired_apple_token', 'Apple 登录已过期，请重新登录');
  if (!Number.isFinite(claims.iat) || claims.iat > nowSeconds + CLOCK_SKEW_SECONDS || claims.iat < nowSeconds - MAX_ID_TOKEN_AGE_SECONDS) {
    fail(401, 'stale_apple_token', 'Apple 登录校验已过期，请重新登录');
  }
  if (typeof claims.sub !== 'string' || claims.sub.length < 3 || claims.sub.length > 255) fail(401, 'invalid_apple_subject', 'Apple 账户标识无效');
  if (typeof rawNonce === 'string' && (!claims.nonce || !safeEqual(claims.nonce, expectedNonce(rawNonce)))) {
    fail(401, 'invalid_apple_nonce', 'Apple 登录校验不一致，请重新登录');
  }
  return {
    sub: claims.sub,
    email: typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null,
    emailVerified: truthyClaim(claims.email_verified),
    privateEmail: truthyClaim(claims.is_private_email)
  };
}

async function readAppleResponse(response, failureCode, failureMessage) {
  let data = {};
  try { data = await response.json(); } catch { /* Apple may return an empty error body. */ }
  if (!response.ok) fail(401, failureCode, failureMessage);
  return data;
}

export async function exchangeAppleAuthorization({ authorizationCode, rawNonce }, {
  env = process.env,
  fetcher = fetch,
  now = Date.now()
} = {}) {
  assertAuthorizationInput(authorizationCode, rawNonce);
  const config = environment(env);
  if (!appleAuthConfigured(env)) fail(503, 'apple_auth_not_configured', 'Apple 登录仍在配置中，请先使用邮箱登录');

  const body = new URLSearchParams({
    client_id: config.clientID,
    client_secret: createAppleClientSecret({ env, now }),
    code: authorizationCode,
    grant_type: 'authorization_code'
  });
  let tokenResponse;
  try {
    tokenResponse = await fetcher(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
  } catch {
    fail(502, 'apple_auth_unavailable', '暂时无法连接 Apple 登录服务，请稍后重试');
  }
  const tokenData = await readAppleResponse(tokenResponse, 'apple_code_rejected', 'Apple 授权已失效，请重新登录');
  if (typeof tokenData.id_token !== 'string') fail(401, 'apple_token_missing', 'Apple 未返回有效登录凭证');

  let keysResponse;
  try { keysResponse = await fetcher(APPLE_KEYS_URL, { headers: { Accept: 'application/json' } }); }
  catch { fail(502, 'apple_keys_unavailable', '暂时无法验证 Apple 登录，请稍后重试'); }
  const jwks = await readAppleResponse(keysResponse, 'apple_keys_unavailable', '暂时无法验证 Apple 登录，请稍后重试');
  const identity = validateAppleIdentityToken(tokenData.id_token, {
    rawNonce,
    clientID: config.clientID,
    jwks,
    now
  });
  return {
    ...identity,
    refreshToken: typeof tokenData.refresh_token === 'string' ? tokenData.refresh_token : null
  };
}

function tokenEncryptionKey(env = process.env) {
  const secret = environment(env).tokenKey;
  if (!secret) fail(503, 'apple_auth_not_configured', 'Apple 登录加密配置缺失');
  return createHash('sha256').update(secret).digest();
}

export function encryptAppleRefreshToken(token, env = process.env) {
  if (typeof token !== 'string' || !token) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenEncryptionKey(env), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', encode(iv), encode(cipher.getAuthTag()), encode(ciphertext)].join('.');
}

export function decryptAppleRefreshToken(value, env = process.env) {
  try {
    const [version, iv, tag, ciphertext] = String(value || '').split('.');
    if (version !== 'v1' || !iv || !tag || !ciphertext) return null;
    const decipher = createDecipheriv('aes-256-gcm', tokenEncryptionKey(env), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final()
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export async function revokeAppleRefreshToken(encryptedToken, {
  env = process.env,
  fetcher = fetch,
  now = Date.now()
} = {}) {
  if (!encryptedToken) return;
  const token = decryptAppleRefreshToken(encryptedToken, env);
  if (!token) fail(503, 'apple_refresh_token_unreadable', 'Apple 授权信息无法读取，请联系支持');
  const config = environment(env);
  const body = new URLSearchParams({
    client_id: config.clientID,
    client_secret: createAppleClientSecret({ env, now }),
    token,
    token_type_hint: 'refresh_token'
  });
  let response;
  try {
    response = await fetcher(APPLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
  } catch {
    fail(502, 'apple_revoke_unavailable', '暂时无法撤销 Apple 授权，请稍后再试');
  }
  if (!response.ok) fail(502, 'apple_revoke_failed', 'Apple 授权未能撤销，请稍后再试');
}

export function normalizedAppleName(value) {
  const name = String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return name ? name.slice(0, 60) : 'Wonder 用户';
}
