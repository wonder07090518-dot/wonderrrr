import assert from 'node:assert/strict';
import {
  createHash,
  generateKeyPairSync,
  sign,
  verify
} from 'node:crypto';
import test from 'node:test';

import appleAuthHandler from '../api/_apple-auth-route.js';
import {
  AppleAuthError,
  appleAuthConfigured,
  createAppleClientSecret,
  decryptAppleRefreshToken,
  encryptAppleRefreshToken,
  validateAppleIdentityToken
} from '../api/_apple-auth.js';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function makeIdentityToken({ privateKey, kid, clientID, rawNonce, email = 'apple@example.com', now = Date.now() }) {
  const header = base64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: 'https://appleid.apple.com',
    aud: clientID,
    sub: 'apple-subject-123',
    email,
    email_verified: 'true',
    is_private_email: 'false',
    nonce: createHash('sha256').update(rawNonce).digest('hex'),
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + 300
  }));
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), privateKey);
  return `${header}.${claims}.${signature.toString('base64url')}`;
}

function responseRecorder() {
  const record = { statusCode: 200, body: null, headers: {} };
  return {
    record,
    response: {
      status(code) { record.statusCode = code; return this; },
      json(body) { record.body = body; return this; },
      setHeader(name, value) { record.headers[name] = value; }
    }
  };
}

function appleTestKeys() {
  const appleSigning = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const developerSigning = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const kid = 'APPLEKEY1';
  const jwk = appleSigning.publicKey.export({ format: 'jwk' });
  jwk.kid = kid;
  jwk.kty = 'RSA';
  return { appleSigning, developerSigning, kid, jwk };
}

test('Apple identity token validates signature, audience, freshness and nonce', () => {
  const { appleSigning, kid, jwk } = appleTestKeys();
  const now = Date.now();
  const rawNonce = 'a-secure-random-nonce-123456';
  const clientID = 'com.wonderadlab.app';
  const token = makeIdentityToken({ privateKey: appleSigning.privateKey, kid, clientID, rawNonce, now });
  const identity = validateAppleIdentityToken(token, { rawNonce, clientID, jwks: { keys: [jwk] }, now });
  assert.deepEqual(identity, {
    sub: 'apple-subject-123',
    email: 'apple@example.com',
    emailVerified: true,
    privateEmail: false
  });
  assert.throws(
    () => validateAppleIdentityToken(token, { rawNonce: 'different-secure-nonce-123', clientID, jwks: { keys: [jwk] }, now }),
    error => error instanceof AppleAuthError && error.code === 'invalid_apple_nonce'
  );
});

test('Apple client secret is a five-minute ES256 JWT and refresh tokens are encrypted', () => {
  const { developerSigning } = appleTestKeys();
  const now = Date.now();
  const env = {
    APPLE_CLIENT_ID: 'com.wonderadlab.app',
    APPLE_TEAM_ID: 'TVM2FCNW4V',
    APPLE_KEY_ID: 'KEY1234567',
    APPLE_PRIVATE_KEY: developerSigning.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    USER_SESSION_SECRET: 'test-session-secret-with-enough-entropy'
  };
  assert.equal(appleAuthConfigured(env), true);
  const token = createAppleClientSecret({ env, now });
  const [header, payload, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'ES256');
  assert.equal(claims.sub, env.APPLE_CLIENT_ID);
  assert.equal(claims.exp - claims.iat, 300);
  assert.equal(verify('sha256', Buffer.from(`${header}.${payload}`), {
    key: developerSigning.publicKey,
    dsaEncoding: 'ieee-p1363'
  }, Buffer.from(signature, 'base64url')), true);

  const encrypted = encryptAppleRefreshToken('refresh-token-secret', env);
  assert.notEqual(encrypted, 'refresh-token-secret');
  assert.equal(decryptAppleRefreshToken(encrypted, env), 'refresh-token-secret');
});

test('Apple login never auto-merges an existing password account with the same email', async () => {
  const originalFetch = globalThis.fetch;
  const keys = appleTestKeys();
  const environmentNames = ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY', 'USER_SESSION_SECRET', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const originalEnvironment = Object.fromEntries(environmentNames.map(name => [name, process.env[name]]));
  const now = Date.now();
  const rawNonce = 'another-secure-random-nonce-123';
  const identityToken = makeIdentityToken({
    privateKey: keys.appleSigning.privateKey,
    kid: keys.kid,
    clientID: 'com.wonderadlab.app',
    rawNonce,
    now,
    email: 'existing@example.com'
  });
  Object.assign(process.env, {
    APPLE_CLIENT_ID: 'com.wonderadlab.app',
    APPLE_TEAM_ID: 'TVM2FCNW4V',
    APPLE_KEY_ID: 'KEY1234567',
    APPLE_PRIVATE_KEY: keys.developerSigning.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    USER_SESSION_SECRET: 'test-session-secret-with-enough-entropy',
    KV_REST_API_URL: 'https://mock-kv.invalid',
    KV_REST_API_TOKEN: 'test-kv-token'
  });
  const store = new Map([['wonder:user:existing@example.com', JSON.stringify({
    email: 'existing@example.com',
    name: 'Existing',
    provider: 'password',
    passwordSalt: 'salt',
    passwordHash: 'hash'
  })]]);
  globalThis.fetch = async (url, options = {}) => {
    const value = String(url);
    if (value === 'https://appleid.apple.com/auth/token') {
      return new Response(JSON.stringify({ id_token: identityToken, refresh_token: 'apple-refresh-token' }), { status: 200 });
    }
    if (value === 'https://appleid.apple.com/auth/keys') {
      return new Response(JSON.stringify({ keys: [keys.jwk] }), { status: 200 });
    }
    const parsed = new URL(value);
    if (parsed.hostname === 'mock-kv.invalid') {
      const [command, ...args] = parsed.pathname.slice(1).split('/').map(decodeURIComponent);
      let result = null;
      if (command === 'get') result = store.get(args[0]) ?? null;
      else if (command === 'set') { store.set(args[0], args[1]); result = 'OK'; }
      return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unexpected request: ${value} ${options.method || 'GET'}`);
  };

  try {
    const result = responseRecorder();
    await appleAuthHandler({
      method: 'POST',
      headers: {},
      body: { action: 'login', authorizationCode: 'single-use-code', rawNonce, name: 'Apple User' }
    }, result.response);
    assert.equal(result.record.statusCode, 409);
    assert.equal(result.record.body.code, 'account_link_required');
    assert.equal(store.size, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of environmentNames) {
      if (originalEnvironment[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnvironment[name];
    }
  }
});
