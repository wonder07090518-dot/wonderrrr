import assert from 'node:assert/strict';
import test from 'node:test';
import balancePaymentHandler, { balanceDebitScript, catalogAmount } from '../api/_balance-payment-route.js';
import { issueUserSession } from '../api/_user.js';

test('catalogAmount accepts only a positive integer price at the start of a catalog label', () => {
  assert.equal(catalogAmount('¥16 / 张'), 16);
  assert.equal(catalogAmount('¥129 / 10 张起'), 129);
  assert.equal(catalogAmount('AI 评估报价'), 0);
  assert.equal(catalogAmount('about ¥16'), 0);
});

test('balance debit script checks idempotency and funds before changing the balance', () => {
  const duplicateCheck = balanceDebitScript.indexOf("redis.call('EXISTS', KEYS[2])");
  const fundsCheck = balanceDebitScript.indexOf('current < amount');
  const debit = balanceDebitScript.indexOf("redis.call('DECRBY', KEYS[1], amount)");
  const marker = balanceDebitScript.indexOf("redis.call('SET', KEYS[2], ARGV[2])");
  assert.ok(duplicateCheck >= 0);
  assert.ok(fundsCheck > duplicateCheck);
  assert.ok(debit > fundsCheck);
  assert.ok(marker > debit);
});

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

test('handler deducts once, rejects insufficient funds and never makes the balance negative', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnvironment = {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    USER_SESSION_SECRET: process.env.USER_SESSION_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM
  };
  process.env.KV_REST_API_URL = 'https://mock-kv.invalid';
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.USER_SESSION_SECRET = 'test-session-secret';
  process.env.RESEND_API_KEY = 'test-email-key';
  process.env.MAIL_FROM = 'Wonder Test <test@example.com>';

  const email = 'buyer@example.com';
  const store = new Map([
    [`wonder:user:${email}`, JSON.stringify({ email, name: 'Buyer' })],
    [`wonder:balance:${email}`, '50'],
    ['wonder:order:WA-ENOUGH', JSON.stringify({ id: 'WA-ENOUGH', email, service: '社媒封面', payment: '微信支付', status: '审核中', size: '1:1', style: '极简', idea: 'Test order', referenceFiles: [] })],
    ['wonder:order:WA-SHORT', JSON.stringify({ id: 'WA-SHORT', email, service: '电商商品图', payment: '微信支付', status: '审核中', size: '1:1', style: '极简', idea: 'Test order', referenceFiles: [] })]
  ]);
  let emailRequests = 0;
  globalThis.fetch = async url => {
    const parsed = new URL(String(url));
    if (parsed.hostname === 'api.resend.com') { emailRequests += 1; return new Response('{}', { status: 200 }); }
    const parts = parsed.pathname.slice(1).split('/').map(decodeURIComponent);
    const [command, ...args] = parts;
    let result = null;
    if (command === 'get') result = store.get(args[0]) ?? null;
    else if (command === 'set') { store.set(args[0], args[1]); result = 'OK'; }
    else if (command === 'eval') {
      const [, , balanceKey, markerKey, rawAmount, orderId] = args;
      const current = Number(store.get(balanceKey) || 0);
      const amount = Number(rawAmount);
      if (store.has(markerKey)) result = [2, current];
      else if (current < amount) result = [0, current];
      else { store.set(balanceKey, String(current - amount)); store.set(markerKey, orderId); result = [1, current - amount]; }
    }
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const session = responseRecorder();
  issueUserSession(session.response, { email, name: 'Buyer' });
  const cookie = session.record.headers['Set-Cookie'].split(';')[0];
  const call = async orderId => {
    const result = responseRecorder();
    await balancePaymentHandler({ method: 'POST', headers: { cookie }, body: { orderId } }, result.response);
    return result.record;
  };

  try {
    const paid = await call('WA-ENOUGH');
    assert.equal(paid.statusCode, 200);
    assert.equal(paid.body.balance, 34);
    assert.equal(JSON.parse(store.get('wonder:order:WA-ENOUGH')).status, '已支付');
    assert.equal(emailRequests, 2);

    const repeated = await call('WA-ENOUGH');
    assert.equal(repeated.statusCode, 200);
    assert.equal(repeated.body.alreadyPaid, true);
    assert.equal(Number(store.get(`wonder:balance:${email}`)), 34);

    store.set(`wonder:balance:${email}`, '10');
    const insufficient = await call('WA-SHORT');
    assert.equal(insufficient.statusCode, 402);
    assert.equal(insufficient.body.required, 22);
    assert.equal(Number(store.get(`wonder:balance:${email}`)), 10);
    assert.equal(JSON.parse(store.get('wonder:order:WA-SHORT')).status, '审核中');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
