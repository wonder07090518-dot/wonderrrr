import assert from 'node:assert/strict';
import test from 'node:test';

import rechargesHandler from '../api/_recharges-route.js';
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

test('top-up route calculates the bonus server-side and credits an approved top-up once', async () => {
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
  const rechargeIds = [];
  globalThis.fetch = async url => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'api.resend.com') return new Response('{}', { status: 200 });
    const [command, ...args] = parsed.pathname.slice(1).split('/').map(decodeURIComponent);
    let result = null;
    if (command === 'get') result = store.get(args[0]) ?? null;
    else if (command === 'set') { store.set(args[0], args[1]); result = 'OK'; }
    else if (command === 'zadd') { if (!rechargeIds.includes(args[2])) rechargeIds.push(args[2]); result = 1; }
    else if (command === 'setnx') {
      if (store.has(args[0])) result = 0;
      else { store.set(args[0], args[1]); result = 1; }
    } else if (command === 'incrby') {
      const next = Number(store.get(args[0]) || 0) + Number(args[1]);
      store.set(args[0], String(next));
      result = next;
    }
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const userSession = responseRecorder();
  issueUserSession(userSession.response, { email, name: 'Buyer' });
  const userCookie = userSession.record.headers['Set-Cookie'].split(';')[0];
  const adminSession = responseRecorder();
  issueSession(adminSession.response, 'admin');
  const adminCookie = adminSession.record.headers['Set-Cookie'].split(';')[0];
  const id = 'RC1234567890';

  try {
    const created = responseRecorder();
    await rechargesHandler({ method: 'POST', headers: { cookie: userCookie }, body: { id, amount: 100, creditedAmount: 9999, bonusAmount: 9999, payment: '微信支付' } }, created.response);
    assert.equal(created.record.statusCode, 201);
    const stored = JSON.parse(store.get(`wonder:recharge:${id}`));
    assert.equal(stored.amount, 100);
    assert.equal(stored.bonusAmount, 10);
    assert.equal(stored.creditedAmount, 110);
    assert.deepEqual(rechargeIds, [id]);

    const approved = responseRecorder();
    await rechargesHandler({ method: 'PUT', headers: { cookie: adminCookie }, body: { id, action: 'approve' } }, approved.response);
    assert.equal(approved.record.statusCode, 200);
    assert.equal(approved.record.body.balance, 110);
    assert.equal(Number(store.get(`wonder:balance:${email}`)), 110);

    const repeated = responseRecorder();
    await rechargesHandler({ method: 'PUT', headers: { cookie: adminCookie }, body: { id, action: 'approve' } }, repeated.response);
    assert.equal(repeated.record.statusCode, 200);
    assert.equal(repeated.record.body.balance, 110);
    assert.equal(Number(store.get(`wonder:balance:${email}`)), 110);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
