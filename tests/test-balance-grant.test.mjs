import assert from 'node:assert/strict';
import test from 'node:test';

import paymentHandler, { testBalanceGrantScript } from '../api/payment-confirm.js';
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

test('one-time test credit is scoped to the eligible Apple order and remains separate from real balance', async () => {
  assert.match(testBalanceGrantScript, /EXISTS/);
  assert.match(testBalanceGrantScript, /INCRBY/);

  const originalFetch = globalThis.fetch;
  const keys = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'USER_SESSION_SECRET', 'WONDER_TEST_BALANCE_ORDER_ID'];
  const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const email = 'apple-buyer@example.com';
  const orderId = 'WA-APPLE-TEST';
  process.env.KV_REST_API_URL = 'https://mock-kv.invalid';
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.USER_SESSION_SECRET = 'test-session-secret';
  process.env.WONDER_TEST_BALANCE_ORDER_ID = orderId;

  const store = new Map([
    [`wonder:user:${email}`, JSON.stringify({ email, name: 'Apple Buyer', provider: 'apple', appleSub: 'apple-sub' })],
    [`wonder:balance:${email}`, '0'],
    [`wonder:test-balance:${email}`, '0'],
    [`wonder:order:${orderId}`, JSON.stringify({ id: orderId, email, service: '其他需求', payment: '微信支付', status: '审核中', createdAt: new Date().toISOString() })]
  ]);

  globalThis.fetch = async url => {
    const parsed = new URL(String(url));
    const parts = parsed.pathname.slice(1).split('/').map(decodeURIComponent);
    const [command, ...args] = parts;
    let result = null;
    if (command === 'get') result = store.get(args[0]) ?? null;
    else if (command === 'eval') {
      const [, , testKey, markerKey, rawAmount, markerValue] = args;
      const current = Number(store.get(testKey) || 0);
      if (store.has(markerKey)) result = [2, current];
      else {
        const updated = current + Number(rawAmount);
        store.set(testKey, String(updated));
        store.set(markerKey, markerValue);
        result = [1, updated];
      }
    }
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const session = responseRecorder();
  issueUserSession(session.response, { email, name: 'Apple Buyer' });
  const cookie = session.record.headers['Set-Cookie'].split(';')[0];
  const call = async () => {
    const result = responseRecorder();
    await paymentHandler({ method: 'POST', query: { action: 'test-balance-grant' }, headers: { cookie }, body: { orderId } }, result.response);
    return result.record;
  };

  try {
    const granted = await call();
    assert.equal(granted.statusCode, 200);
    assert.equal(granted.body.balance, 100);
    assert.equal(granted.body.realBalance, 0);
    assert.equal(granted.body.testBalance, 100);
    assert.equal(granted.body.alreadyGranted, false);

    const repeated = await call();
    assert.equal(repeated.statusCode, 200);
    assert.equal(repeated.body.balance, 100);
    assert.equal(repeated.body.alreadyGranted, true);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
