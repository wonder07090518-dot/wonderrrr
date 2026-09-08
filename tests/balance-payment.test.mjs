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
  const duplicateCheck = balanceDebitScript.indexOf("redis.call('GET', KEYS[3])");
  const fundsCheck = balanceDebitScript.indexOf('if test >= amount then');
  const testDebit = balanceDebitScript.indexOf("redis.call('DECRBY', KEYS[2], testUsed)");
  const realChoice = balanceDebitScript.indexOf("elseif mode ~= 'test' and real >= amount then");
  const realDebit = balanceDebitScript.indexOf("redis.call('DECRBY', KEYS[1], realUsed)");
  const marker = balanceDebitScript.indexOf("redis.call('SET', KEYS[3]");
  assert.ok(duplicateCheck >= 0);
  assert.ok(fundsCheck > duplicateCheck);
  assert.ok(testDebit > fundsCheck);
  assert.ok(realChoice > fundsCheck);
  assert.ok(realDebit > fundsCheck);
  assert.ok(marker > realDebit);
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
    [`wonder:test-balance:${email}`, '0'],
    ['wonder:order:WA-ENOUGH', JSON.stringify({ id: 'WA-ENOUGH', email, service: '社媒封面', payment: '微信支付', status: '审核中', size: '1:1', style: '极简', idea: 'Test order', referenceFiles: [] })],
    ['wonder:order:WA-SHORT', JSON.stringify({ id: 'WA-SHORT', email, service: '电商商品图', payment: '微信支付', status: '审核中', size: '1:1', style: '极简', idea: 'Test order', referenceFiles: [] })],
    ['wonder:order:WA-TEST', JSON.stringify({ id: 'WA-TEST', email, service: 'AI 快速配图', payment: '余额支付', status: '审核中', size: '1:1', style: '极简', idea: 'Isolated test order', referenceFiles: [], isTest: true })],
    ['wonder:order:WA-TEST-CREDIT', JSON.stringify({ id: 'WA-TEST-CREDIT', email, service: 'AI 快速配图', payment: '余额支付', status: '审核中', size: '1:1', style: '极简', idea: 'Test-credit order', referenceFiles: [] })]
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
      const [, , realKey, testKey, markerKey, rawAmount, orderId, mode = 'auto'] = args;
      const real = Number(store.get(realKey) || 0);
      const testCredit = Number(store.get(testKey) || 0);
      const amount = Number(rawAmount);
      if (store.has(markerKey)) result = [2, real, testCredit, store.get(markerKey)];
      else if (testCredit >= amount) {
        const testUsed = amount;
        const realUsed = 0;
        const source = 'test';
        store.set(realKey, String(real - realUsed));
        store.set(testKey, String(testCredit - testUsed));
        store.set(markerKey, `${source}:${orderId}`);
        result = [1, real - realUsed, testCredit - testUsed, source];
      } else if (mode !== 'test' && real >= amount) {
        const source = 'real';
        store.set(realKey, String(real - amount));
        store.set(markerKey, `${source}:${orderId}`);
        result = [1, real - amount, testCredit, source];
      } else {
        result = [0, real, testCredit, ''];
      }
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

    store.set(`wonder:balance:${email}`, '50');
    store.set(`wonder:test-balance:${email}`, '50');
    const isolated = await call('WA-TEST');
    assert.equal(isolated.statusCode, 200);
    assert.equal(isolated.body.balance, 88);
    assert.equal(isolated.body.realBalance, 50);
    assert.equal(isolated.body.testBalance, 38);
    assert.equal(isolated.body.emailSkipped, true);
    assert.equal(emailRequests, 2);

    store.set(`wonder:balance:${email}`, '0');
    store.set(`wonder:test-balance:${email}`, '50');
    const testCreditPaid = await call('WA-TEST-CREDIT');
    assert.equal(testCreditPaid.statusCode, 200);
    assert.equal(testCreditPaid.body.balance, 38);
    assert.equal(testCreditPaid.body.realBalance, 0);
    assert.equal(testCreditPaid.body.testBalance, 38);
    assert.equal(testCreditPaid.body.emailSkipped, true);
    assert.equal(JSON.parse(store.get('wonder:order:WA-TEST-CREDIT')).isTest, true);
    assert.equal(emailRequests, 2);

    store.set(`wonder:balance:${email}`, '50');
    store.set(`wonder:test-balance:${email}`, '5');
    store.set('wonder:order:WA-NO-MIX', JSON.stringify({ id: 'WA-NO-MIX', email, service: 'AI 快速配图', price: '¥12 / 张', payment: '余额支付', status: '审核中', size: '1:1', style: '极简', idea: 'Never mix balances', referenceFiles: [] }));
    const noMix = await call('WA-NO-MIX');
    assert.equal(noMix.statusCode, 200);
    assert.equal(noMix.body.realBalance, 38);
    assert.equal(noMix.body.testBalance, 5);
    assert.equal(noMix.body.order.isTest, false);
    assert.equal(JSON.parse(store.get('wonder:order:WA-NO-MIX')).fundingSource, 'real');
    assert.equal(emailRequests, 4);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
