import assert from 'node:assert/strict';
import { createCipheriv } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import wechatSupportHandler, { decryptWechatPayload, syncWechatMessages, verifyWechatSignature, wechatSignature } from '../api/_wechat-support-route.js';

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

function encryptWechatPayload(message, receiverId, encodingAESKey) {
  const key = Buffer.from(`${encodingAESKey}=`, 'base64');
  const messageBuffer = Buffer.from(message);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(messageBuffer.length);
  const clear = Buffer.concat([Buffer.alloc(16, 7), length, messageBuffer, Buffer.from(receiverId)]);
  const padding = 32 - (clear.length % 32 || 32);
  const padded = Buffer.concat([clear, Buffer.alloc(padding || 32, padding || 32)]);
  const cipher = createCipheriv('aes-256-cbc', key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString('base64');
}

function networkMock() {
  const store = new Map();
  const sorted = [];
  const sent = [];
  const fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.hostname === 'kv.test') {
      const [command, ...args] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      let result = null;
      if (command === 'get') result = store.get(args[0]) ?? null;
      if (command === 'set') {
        if (args.includes('nx') && store.has(args[0])) result = null;
        else { store.set(args[0], args[1]); result = 'OK'; }
      }
      if (command === 'del') { store.delete(args[0]); result = 1; }
      if (command === 'zadd') { if (!sorted.includes(args[2])) sorted.push(args[2]); result = 1; }
      return { ok: true, async json() { return { result }; } };
    }
    if (url.pathname === '/cgi-bin/gettoken') return { ok: true, async json() { return { errcode: 0, access_token: 'access-token', expires_in: 7200 }; } };
    if (url.pathname === '/cgi-bin/kf/sync_msg') {
      return { ok: true, async json() { return { errcode: 0, has_more: 0, next_cursor: '', msg_list: [
        { origin: 3, external_userid: 'external-1', open_kfid: 'kf-1', msgid: 'message-known', msgtype: 'text', text: { content: '海报怎么收费？' } },
        { origin: 3, external_userid: 'external-2', open_kfid: 'kf-1', msgid: 'message-human', msgtype: 'text', text: { content: '能不能为我制定长期品牌策略？' } }
      ] }; } };
    }
    if (url.pathname === '/cgi-bin/kf/send_msg') {
      sent.push(JSON.parse(options.body));
      return { ok: true, async json() { return { errcode: 0, errmsg: 'ok' }; } };
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return { fetch, sent, sorted, store };
}

test('WeCom callback signatures and encrypted payloads verify correctly', () => {
  const encodingAESKey = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
  const encrypted = encryptWechatPayload('<xml>hello</xml>', 'corp-id', encodingAESKey);
  const signature = wechatSignature('callback-token', '1710000000', 'abc123', encrypted);
  assert.equal(verifyWechatSignature({ token: 'callback-token', timestamp: '1710000000', nonce: 'abc123', encrypted, signature }), true);
  assert.equal(verifyWechatSignature({ token: 'wrong', timestamp: '1710000000', nonce: 'abc123', encrypted, signature }), false);
  assert.deepEqual(decryptWechatPayload(encrypted, encodingAESKey), { message: '<xml>hello</xml>', receiverId: 'corp-id' });
});

test('enterprise WeChat callback accepts parsed XML request bodies', async () => {
  const keys = ['WECOM_CORP_ID', 'WECOM_KF_SECRET', 'WECOM_KF_TOKEN', 'WECOM_KF_ENCODING_AES_KEY', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const encodingAESKey = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
  const encrypted = encryptWechatPayload('<xml><Event><![CDATA[noop]]></Event></xml>', 'corp-id', encodingAESKey);
  const timestamp = '1710000000';
  const nonce = 'abc123';
  const signature = wechatSignature('callback-token', timestamp, nonce, encrypted);
  Object.assign(process.env, {
    WECOM_CORP_ID: 'corp-id', WECOM_KF_SECRET: 'kf-secret', WECOM_KF_TOKEN: 'callback-token',
    WECOM_KF_ENCODING_AES_KEY: encodingAESKey, KV_REST_API_URL: 'https://kv.test', KV_REST_API_TOKEN: 'kv-token'
  });
  try {
    const res = response();
    await wechatSupportHandler({
      method: 'POST',
      url: `/api/wechat-support?msg_signature=${signature}&timestamp=${timestamp}&nonce=${nonce}`,
      query: { msg_signature: signature, timestamp, nonce },
      headers: { 'content-type': 'application/xml' },
      body: { xml: { Encrypt: [encrypted] } }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'success');
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('enterprise WeChat preview answers known questions and simulates escalation without saving', async () => {
  const known = response();
  await wechatSupportHandler({ method: 'POST', url: '/api/wechat-support?action=preview', query: { action: 'preview' }, body: { question: '海报怎么收费？' } }, known);
  assert.equal(known.statusCode, 200);
  assert.equal(known.body.saved, false);
  assert.equal(known.body.handled, true);
  assert.match(known.body.answer, /¥19\/张/);

  const unknown = response();
  await wechatSupportHandler({ method: 'POST', url: '/api/wechat-support?action=preview', query: { action: 'preview' }, body: { question: '能不能为我制定长期品牌策略？' } }, unknown);
  assert.equal(unknown.body.queued, true);
  assert.equal(unknown.body.saved, false);
});

test('enterprise WeChat sync auto-answers known questions and queues unknown questions once', async () => {
  const keys = ['WECOM_CORP_ID', 'WECOM_KF_SECRET', 'WECOM_KF_TOKEN', 'WECOM_KF_ENCODING_AES_KEY', 'WECOM_API_ORIGIN', 'WECOM_API_PROXY_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  Object.assign(process.env, {
    WECOM_CORP_ID: 'corp-id', WECOM_KF_SECRET: 'kf-secret', WECOM_KF_TOKEN: 'callback-token',
    WECOM_KF_ENCODING_AES_KEY: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', KV_REST_API_URL: 'https://kv.test', KV_REST_API_TOKEN: 'kv-token'
  });
  const network = networkMock();
  global.fetch = network.fetch;
  try {
    const processed = await syncWechatMessages({ token: 'sync-token', openKfId: 'kf-1' });
    assert.equal(processed, 2);
    assert.equal(network.sent.length, 2);
    assert.match(network.sent[0].text.content, /¥19\/张/);
    assert.match(network.sent[1].text.content, /人工核对/);
    assert.equal(network.sorted.length, 1);
    const ticket = JSON.parse(network.store.get(`wonder:support-ticket:${network.sorted[0]}`));
    assert.equal(ticket.channel, 'wechat');
    assert.equal(ticket.status, 'open');
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('enterprise WeChat API can use an authenticated fixed-IP proxy', async () => {
  const keys = ['WECOM_CORP_ID', 'WECOM_KF_SECRET', 'WECOM_KF_TOKEN', 'WECOM_KF_ENCODING_AES_KEY', 'WECOM_API_ORIGIN', 'WECOM_API_PROXY_TOKEN', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const seen = [];
  Object.assign(process.env, {
    WECOM_CORP_ID: 'corp-id', WECOM_KF_SECRET: 'kf-secret', WECOM_KF_TOKEN: 'callback-token',
    WECOM_KF_ENCODING_AES_KEY: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    WECOM_API_ORIGIN: 'https://wecom-proxy.example.com', WECOM_API_PROXY_TOKEN: 'proxy-token',
    KV_REST_API_URL: 'https://kv.test', KV_REST_API_TOKEN: 'kv-token'
  });
  const network = networkMock();
  global.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.hostname === 'wecom-proxy.example.com') {
      seen.push({ url, options });
      if (url.pathname === '/cgi-bin/gettoken') return { ok: true, async json() { return { errcode: 0, access_token: 'proxy-access-token', expires_in: 7200 }; } };
      if (url.pathname === '/cgi-bin/kf/sync_msg') return { ok: true, async json() { return { errcode: 0, has_more: 0, next_cursor: '', msg_list: [] }; } };
    }
    return network.fetch(input, options);
  };
  try {
    await syncWechatMessages({ token: 'sync-token', openKfId: 'kf-proxy' });
    assert.ok(seen.length >= 1);
    assert.ok(seen.every(item => item.options.headers.Authorization === 'Bearer proxy-token'));
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('visible demo uses the enterprise WeChat route and never sends or saves previews', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../wechat-preview.html', import.meta.url), 'utf8'),
    readFile(new URL('../wechat-preview.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /仅模拟回复 · 不发送微信 · 不保存内容/);
  assert.match(script, /\/api\/wechat-support\?action=preview/);
  assert.doesNotMatch(script, /wechatExternalUserId|email|password/);
});
