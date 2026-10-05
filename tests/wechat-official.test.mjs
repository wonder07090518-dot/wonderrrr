import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import wechatOfficialHandler, { officialWechatSignature, verifyOfficialWechatSignature } from '../api/_wechat-official-route.js';

function response() {
  return {
    statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    end(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; }
  };
}

function xml(content = '海报怎么收费？', messageId = '1001') {
  return `<xml><ToUserName><![CDATA[official-account]]></ToUserName><FromUserName><![CDATA[user-open-id]]></FromUserName><CreateTime>1710000000</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${content}]]></Content><MsgId>${messageId}</MsgId></xml>`;
}

function kvMock(seed = {}) {
  const store = new Map(Object.entries(seed));
  const sorted = new Map([
    ['wonder:orders', []],
    ['wonder:support-tickets', []]
  ]);
  const fetch = async url => {
    const pieces = new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const [command, ...args] = pieces;
    let result = null;
    if (command === 'get') result = store.get(args[0]) ?? null;
    if (command === 'set') { store.set(args[0], args[1]); result = 'OK'; }
    if (command === 'zadd') {
      const list = sorted.get(args[0]) || [];
      if (!list.includes(args[2])) list.push(args[2]);
      sorted.set(args[0], list);
      result = 1;
    }
    if (command === 'zrevrange') result = [...(sorted.get(args[0]) || [])].reverse();
    return { ok: true, async json() { return { result }; } };
  };
  return { fetch, store, sorted };
}

test('official account signatures are deterministic and verified safely', () => {
  const signature = officialWechatSignature('wonder-token', '1710000000', 'abc123');
  assert.equal(signature.length, 40);
  assert.equal(verifyOfficialWechatSignature({ token: 'wonder-token', timestamp: '1710000000', nonce: 'abc123', signature }), true);
  assert.equal(verifyOfficialWechatSignature({ token: 'wrong', timestamp: '1710000000', nonce: 'abc123', signature }), false);
});

test('preview answers known questions and escalates unknown questions without saving', async () => {
  const known = response();
  await wechatOfficialHandler({ method: 'POST', url: '/api/wechat-official?action=preview', query: { action: 'preview' }, body: { question: '海报怎么收费？' } }, known);
  assert.equal(known.statusCode, 200);
  assert.equal(known.body.preview, true);
  assert.equal(known.body.saved, false);
  assert.equal(known.body.handled, true);
  assert.match(known.body.answer, /¥19\/张/);

  const unknown = response();
  await wechatOfficialHandler({ method: 'POST', url: '/api/wechat-official?action=preview', query: { action: 'preview' }, body: { question: '能不能为我制定长期品牌策略？' } }, unknown);
  assert.equal(unknown.body.queued, true);
  assert.equal(unknown.body.saved, false);
  assert.match(unknown.body.answer, /不会擅自确认/);
});

test('signed callback verifies the URL and turns unknown text into one queue ticket', async () => {
  const original = {
    token: process.env.WECHAT_OFFICIAL_TOKEN,
    url: process.env.KV_REST_API_URL,
    kvToken: process.env.KV_REST_API_TOKEN,
    fetch: global.fetch
  };
  Object.assign(process.env, { WECHAT_OFFICIAL_TOKEN: 'wonder-token', KV_REST_API_URL: 'https://kv.test', KV_REST_API_TOKEN: 'kv-token' });
  const mock = kvMock();
  global.fetch = mock.fetch;
  const timestamp = '1710000000';
  const nonce = 'abc123';
  const signature = officialWechatSignature(process.env.WECHAT_OFFICIAL_TOKEN, timestamp, nonce);

  try {
    const challenge = response();
    await wechatOfficialHandler({ method: 'GET', url: '/api/wechat-official', query: { timestamp, nonce, signature, echostr: 'verified' } }, challenge);
    assert.equal(challenge.statusCode, 200);
    assert.equal(challenge.body, 'verified');

    const callback = response();
    await wechatOfficialHandler({ method: 'POST', url: '/api/wechat-official', query: { timestamp, nonce, signature }, body: xml('能不能为我制定长期品牌策略？', '1002') }, callback);
    assert.equal(callback.statusCode, 200);
    assert.match(callback.headers['Content-Type'], /application\/xml/);
    assert.match(callback.body, /进入统一任务队列/);
    assert.equal(mock.sorted.get('wonder:support-tickets').length, 1);
    const ticketId = mock.sorted.get('wonder:support-tickets')[0];
    const saved = JSON.parse(mock.store.get(`wonder:support-ticket:${ticketId}`));
    assert.equal(saved.channel, 'wechat-official');
    assert.equal(saved.status, 'open');
  } finally {
    global.fetch = original.fetch;
    if (original.token === undefined) delete process.env.WECHAT_OFFICIAL_TOKEN; else process.env.WECHAT_OFFICIAL_TOKEN = original.token;
    if (original.url === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = original.url;
    if (original.kvToken === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = original.kvToken;
  }
});

test('WeChat preview is visibly labelled as a no-send, no-save simulation', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../wechat-preview.html', import.meta.url), 'utf8'),
    readFile(new URL('../wechat-preview.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /仅模拟回复 · 不发送微信 · 不保存内容/);
  assert.match(html, /打开 AI 运营台/);
  assert.match(script, /\/api\/wechat-official\?action=preview/);
  assert.doesNotMatch(script, /wechatOpenId|email|password/);
});
