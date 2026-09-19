import assert from 'node:assert/strict';
import test from 'node:test';

import newsSubmissionsHandler, { readApprovedNews } from '../api/_news-submissions-route.js';
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

test('community AI news stays private until the admin approves it', async () => {
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
      const next = values.filter(item => item.id !== args[2]);
      next.push({ score: Number(args[1]), id: args[2] });
      sortedSets.set(args[0], next);
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
    await newsSubmissionsHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.8', 'user-agent': 'AI Today test' },
      body: {
        author: 'Reader',
        email: 'reader@example.com',
        title: 'A useful community AI update',
        summary: 'This description is long enough to explain why the submitted update matters to readers.',
        sourceName: 'Example Lab',
        sourceURL: 'https://example.com/ai-update',
        date: '2026-09-18'
      }
    }, created.response);
    assert.equal(created.record.statusCode, 201);
    assert.equal(created.record.body.status, 'pending');
    assert.deepEqual(await readApprovedNews(), []);

    const adminSession = recorder();
    issueSession(adminSession.response, 'admin');
    const cookie = adminSession.record.headers['Set-Cookie'].split(';')[0];
    const listing = recorder();
    await newsSubmissionsHandler({ method: 'GET', headers: { cookie } }, listing.response);
    assert.equal(listing.record.statusCode, 200);
    assert.equal(listing.record.body.submissions[0].status, 'pending');

    const approved = recorder();
    await newsSubmissionsHandler({ method: 'PUT', headers: { cookie }, body: { id: created.record.body.id, action: 'approve' } }, approved.response);
    assert.equal(approved.record.statusCode, 200);
    const publicItems = await readApprovedNews();
    assert.equal(publicItems.length, 1);
    assert.equal(publicItems[0].sourceKind, 'community');
    assert.equal(publicItems[0].verified, true);
    assert.equal(publicItems[0].categoryZH, '社区投稿');

    const rejected = recorder();
    await newsSubmissionsHandler({ method: 'PUT', headers: { cookie }, body: { id: created.record.body.id, action: 'reject' } }, rejected.response);
    assert.equal(rejected.record.statusCode, 200);
    assert.deepEqual(await readApprovedNews(), []);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('news submission validation rejects unsafe sources', async () => {
  const original = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  process.env.KV_REST_API_URL = 'https://mock-kv.invalid';
  process.env.KV_REST_API_TOKEN = 'test-token';
  try {
    const result = recorder();
    await newsSubmissionsHandler({ method: 'POST', headers: {}, body: { author: 'Reader', email: 'reader@example.com', title: 'Unsafe update', summary: 'This summary contains enough detail for basic validation.', sourceName: 'Example', sourceURL: 'http://example.com', date: '2026-09-18' } }, result.response);
    assert.equal(result.record.statusCode, 400);
  } finally {
    if (original.url === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = original.url;
    if (original.token === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = original.token;
  }
});
