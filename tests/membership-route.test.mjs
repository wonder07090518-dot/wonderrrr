import assert from 'node:assert/strict';
import test from 'node:test';

import membershipsHandler, { membershipActivationScript } from '../api/_memberships-route.js';
import { issueSession } from '../api/_admin.js';
import { issueUserSession } from '../api/_user.js';

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

test('membership activation is atomic and extends from an existing expiry', () => {
  const duplicateCheck = membershipActivationScript.indexOf("redis.call('EXISTS', KEYS[1])");
  const currentExpiry = membershipActivationScript.indexOf("redis.call('GET', KEYS[2])");
  const marker = membershipActivationScript.indexOf("redis.call('SET', KEYS[1], ARGV[3])");
  const expiryWrite = membershipActivationScript.indexOf("redis.call('SET', KEYS[2], expires)");
  assert.ok(duplicateCheck >= 0);
  assert.ok(currentExpiry > duplicateCheck);
  assert.ok(marker > currentExpiry);
  assert.ok(expiryWrite > marker);
});

test('membership route owns pricing, records pending confirmation and activates only once', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'USER_SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'RESEND_API_KEY', 'MAIL_FROM'];
  const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    KV_REST_API_URL: 'https://mock-kv.invalid',
    KV_REST_API_TOKEN: 'test-token',
    USER_SESSION_SECRET: 'test-user-session',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'test-admin-password',
    ADMIN_SESSION_SECRET: 'test-admin-session',
    RESEND_API_KEY: 'test-email-key',
    MAIL_FROM: 'Wonder Test <test@example.com>'
  });

  const email = 'buyer@example.com';
  const store = new Map([[`wonder:user:${email}`, JSON.stringify({ email, name: 'Buyer' })]]);
  const membershipIds = [];
  let emailRequests = 0;
  globalThis.fetch = async url => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'api.resend.com') { emailRequests += 1; return new Response('{}', { status: 200 }); }
    const [command, ...args] = parsed.pathname.slice(1).split('/').map(decodeURIComponent);
    let result = null;
    if (command === 'get') result = store.get(args[0]) ?? null;
    else if (command === 'set') { store.set(args[0], args[1]); result = 'OK'; }
    else if (command === 'zadd') { if (!membershipIds.includes(args[2])) membershipIds.push(args[2]); result = 1; }
    else if (command === 'zrevrange') result = [...membershipIds].reverse();
    else if (command === 'incr') { const next = Number(store.get(args[0]) || 0) + 1; store.set(args[0], String(next)); result = next; }
    else if (command === 'expire') result = 1;
    else if (command === 'eval') {
      const [, , appliedKey, memberExpiryKey, rawNow, rawDuration, marker] = args;
      const current = Number(store.get(memberExpiryKey) || 0);
      if (store.has(appliedKey)) result = [0, current];
      else {
        const expires = Math.max(current, Number(rawNow)) + Number(rawDuration);
        store.set(appliedKey, marker);
        store.set(memberExpiryKey, String(expires));
        result = [1, expires];
      }
    }
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const userSession = responseRecorder();
  issueUserSession(userSession.response, { email, name: 'Buyer' });
  const userCookie = userSession.record.headers['Set-Cookie'].split(';')[0];
  const adminSession = responseRecorder();
  issueSession(adminSession.response, 'admin');
  const adminCookie = adminSession.record.headers['Set-Cookie'].split(';')[0];
  const id = 'MB1234567890';

  try {
    const created = responseRecorder();
    await membershipsHandler({ method: 'POST', headers: { cookie: userCookie }, body: { id, plan: 'yearly', amount: 1, durationDays: 9999, payment: '微信支付' } }, created.response);
    assert.equal(created.record.statusCode, 201);
    assert.equal(created.record.body.amount, 199);
    const stored = JSON.parse(store.get(`wonder:membership-request:${id}`));
    assert.equal(stored.amount, 199);
    assert.equal(stored.durationDays, 365);
    assert.equal(stored.status, '待核对');
    assert.deepEqual(membershipIds, [id]);
    assert.equal(emailRequests, 1);

    const approved = responseRecorder();
    await membershipsHandler({ method: 'PUT', headers: { cookie: adminCookie }, body: { id, action: 'approve' } }, approved.response);
    assert.equal(approved.record.statusCode, 200);
    assert.equal(approved.record.body.status, '已生效');
    const firstExpiry = Number(store.get(`wonder:membership-expiry:${email}`));
    assert.ok(firstExpiry > Date.now() + 364 * 24 * 60 * 60 * 1000);
    assert.equal(emailRequests, 2);

    const repeated = responseRecorder();
    await membershipsHandler({ method: 'PUT', headers: { cookie: adminCookie }, body: { id, action: 'approve' } }, repeated.response);
    assert.equal(repeated.record.statusCode, 200);
    assert.equal(repeated.record.body.alreadyApproved, true);
    assert.equal(Number(store.get(`wonder:membership-expiry:${email}`)), firstExpiry);
    assert.equal(emailRequests, 2);

    const listing = responseRecorder();
    await membershipsHandler({ method: 'GET', headers: { cookie: adminCookie } }, listing.response);
    assert.equal(listing.record.statusCode, 200);
    assert.equal(listing.record.body.memberships[0].amount, 199);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
