import assert from 'node:assert/strict';
import test from 'node:test';

import newsCommentsHandler from '../api/_news-comments-route.js';
import { issueSession } from '../api/_admin.js';

function recorder() {
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

test('news comments remain private until approved and can be hidden after publication', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'RESEND_API_KEY', 'MAIL_FROM'];
  const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    KV_REST_API_URL: 'https://mock-kv.invalid',
    KV_REST_API_TOKEN: 'test-token',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'test-admin-password',
    ADMIN_SESSION_SECRET: 'test-admin-session'
  });
  delete process.env.RESEND_API_KEY;
  delete process.env.MAIL_FROM;

  const store = new Map();
  const sortedSets = new Map();
  globalThis.fetch = async url => {
    const parsed = new URL(String(url));
    const [command, ...args] = parsed.pathname.slice(1).split('/').map(decodeURIComponent);
    let result = null;
    if (command === 'get') result = store.get(args[0]) ?? null;
    else if (command === 'set') { store.set(args[0], args[1]); result = 'OK'; }
    else if (command === 'incr') { const next = Number(store.get(args[0]) || 0) + 1; store.set(args[0], String(next)); result = next; }
    else if (command === 'expire') result = 1;
    else if (command === 'zadd') {
      const values = sortedSets.get(args[0]) || [];
      sortedSets.set(args[0], [...values.filter(item => item.id !== args[2]), { score: Number(args[1]), id: args[2] }]);
      result = 1;
    } else if (command === 'zrevrange') {
      result = [...(sortedSets.get(args[0]) || [])].sort((a, b) => b.score - a.score).map(item => item.id);
    } else if (command === 'zrem') {
      sortedSets.set(args[0], (sortedSets.get(args[0]) || []).filter(item => item.id !== args[1]));
      result = 1;
    }
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const created = recorder();
    await newsCommentsHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'AI Today test' },
      body: { newsId: 'anthropic-accenture-embedded-evaluation', displayName: 'Reader', email: 'reader@example.com', body: 'Clear and useful context.' }
    }, created.response);
    assert.equal(created.record.statusCode, 201);
    assert.equal(created.record.body.status, 'pending');

    const privateFeed = recorder();
    await newsCommentsHandler({ method: 'GET', query: { newsId: 'anthropic-accenture-embedded-evaluation' }, headers: {} }, privateFeed.response);
    assert.deepEqual(privateFeed.record.body.comments, []);

    const adminSession = recorder();
    issueSession(adminSession.response, 'admin');
    const cookie = adminSession.record.headers['Set-Cookie'].split(';')[0];
    const approved = recorder();
    await newsCommentsHandler({ method: 'PUT', headers: { cookie }, body: { id: created.record.body.id, action: 'approve' } }, approved.response);
    assert.equal(approved.record.statusCode, 200);

    const publicFeed = recorder();
    await newsCommentsHandler({ method: 'GET', query: { newsId: 'anthropic-accenture-embedded-evaluation' }, headers: {} }, publicFeed.response);
    assert.equal(publicFeed.record.body.comments.length, 1);
    assert.equal(publicFeed.record.body.comments[0].displayName, 'Reader');
    assert.equal('email' in publicFeed.record.body.comments[0], false);

    const hidden = recorder();
    await newsCommentsHandler({ method: 'PUT', headers: { cookie }, body: { id: created.record.body.id, action: 'hide' } }, hidden.response);
    assert.equal(hidden.record.statusCode, 200);
    const hiddenFeed = recorder();
    await newsCommentsHandler({ method: 'GET', query: { newsId: 'anthropic-accenture-embedded-evaluation' }, headers: {} }, hiddenFeed.response);
    assert.deepEqual(hiddenFeed.record.body.comments, []);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
