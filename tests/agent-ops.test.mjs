import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import agentOpsHandler from '../api/_agent-ops-route.js';
import commentReviewAuthHandler from '../api/admin-auth.js';

function response() {
  return {
    statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; }
  };
}

function kvFetch(records) {
  return async url => {
    const [command, ...args] = new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let result = null;
    if (command === 'zrevrange') result = args[0] === 'wonder:orders' ? ['ORDER-1'] : ['TICKET-1'];
    if (command === 'get') result = records[args[0]] || null;
    return { ok: true, async json() { return { result }; } };
  };
}

test('AI operations queue requires authentication', async () => {
  const res = response();
  await agentOpsHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('30-day read-only login sees only sanitized order and support tasks', async () => {
  const keys = ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'COMMENT_REVIEW_USERNAME', 'COMMENT_REVIEW_PASSWORD', 'COMMENT_REVIEW_SESSION_SECRET', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'STRIPE_ENABLE_LIVE', 'STRIPE_SECRET_KEY', 'WECOM_CORP_ID', 'WECOM_KF_SECRET', 'WECOM_KF_TOKEN', 'WECOM_KF_ENCODING_AES_KEY'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  Object.assign(process.env, {
    COMMENT_REVIEW_USERNAME: 'ai-operator', COMMENT_REVIEW_PASSWORD: 'read-only-password', COMMENT_REVIEW_SESSION_SECRET: 'read-only-secret',
    KV_REST_API_URL: 'https://kv.test', KV_REST_API_TOKEN: 'kv-token', STRIPE_ENABLE_LIVE: 'true', STRIPE_SECRET_KEY: 'sk_live_placeholder',
    WECOM_CORP_ID: 'corp', WECOM_KF_SECRET: 'secret', WECOM_KF_TOKEN: 'token', WECOM_KF_ENCODING_AES_KEY: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'
  });
  global.fetch = kvFetch({
    'wonder:order:ORDER-1': JSON.stringify({ id: 'ORDER-1', service: '营销海报', email: 'private@example.com', idea: 'private brief', referenceFiles: ['private.png'], status: '已支付', payment: 'Stripe', turnaround: 'standard', createdAt: '2026-10-04T10:00:00.000Z' }),
    'wonder:support-ticket:TICKET-1': JSON.stringify({ id: 'TICKET-1', channel: 'wechat-official', question: 'private question', wechatOpenId: 'private-open-id', status: 'open', createdAt: '2026-10-04T11:00:00.000Z' })
  });

  try {
    const login = response();
    await commentReviewAuthHandler({ method: 'POST', query: { scope: 'comments' }, headers: {}, body: { username: 'ai-operator', password: 'read-only-password' } }, login);
    const cookie = login.headers['Set-Cookie'].split(';')[0];
    const res = response();
    await agentOpsHandler({ method: 'GET', headers: { cookie } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.privacy, 'sanitized');
    assert.equal(res.body.automation.stripe, true);
    assert.equal(res.body.automation.wecomCustomerService, true);
    assert.equal(res.body.counts.ready, 1);
    assert.equal(res.body.counts.human, 1);
    const serialized = JSON.stringify(res.body);
    for (const privateValue of ['private@example.com', 'private brief', 'private.png', 'private question', 'private-open-id']) {
      assert.equal(serialized.includes(privateValue), false, `private value leaked: ${privateValue}`);
    }
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('AI operations page has no write controls or private-data fields', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../agent-ops.html', import.meta.url), 'utf8'),
    readFile(new URL('../agent-ops.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /一次登录可保持 30 天/);
  assert.match(html, /不显示客户邮箱、微信身份、需求原文、文件或付款资料/);
  assert.match(script, /api\('\/api\/agent-ops'\)/);
  assert.doesNotMatch(script, /method:\s*['"](?:PUT|PATCH)['"]/);
  assert.doesNotMatch(html, />\s*(?:修改价格|确认到账|删除订单)\s*</);
});
