import assert from 'node:assert/strict';
import test from 'node:test';

import analyticsHandler from '../api/_analytics-route.js';
import { issueSession } from '../api/_admin.js';

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

test('real analytics counts signed anonymous browsers and returns country totals only to admins', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET', 'ANALYTICS_SECRET'];
  const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    KV_REST_API_URL: 'https://mock-kv.invalid',
    KV_REST_API_TOKEN: 'test-token',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'test-admin-password',
    ADMIN_SESSION_SECRET: 'test-admin-session',
    ANALYTICS_SECRET: 'test-analytics-secret'
  });

  const store = new Map();
  const sets = new Map();
  globalThis.fetch = async url => {
    const parsed = new URL(String(url));
    const [command, ...args] = parsed.pathname.slice(1).split('/').map(decodeURIComponent);
    let result = null;
    if (command === 'get') result = store.get(args[0]) ?? null;
    else if (command === 'set') { store.set(args[0], args[1]); result = 'OK'; }
    else if (command === 'setnx') {
      if (store.has(args[0])) result = 0;
      else { store.set(args[0], args[1]); result = 1; }
    } else if (command === 'incr') {
      result = Number(store.get(args[0]) || 0) + 1;
      store.set(args[0], String(result));
    } else if (command === 'sadd') {
      const values = sets.get(args[0]) || new Set();
      const before = values.size;
      values.add(args[1]);
      sets.set(args[0], values);
      result = values.size > before ? 1 : 0;
    } else if (command === 'smembers') result = [...(sets.get(args[0]) || [])];
    else if (command === 'expire') result = 1;
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const visit = async ({ cookie = '', country = 'CA', userAgent = 'Safari', host = 'www.wonderadlab.com', privacy = false } = {}) => {
    const result = responseRecorder();
    await analyticsHandler({ method: 'POST', headers: { cookie, host, 'x-forwarded-host': host, 'x-vercel-ip-country': country, 'user-agent': userAgent, 'x-forwarded-for': '203.0.113.7', ...(privacy ? { dnt: '1' } : {}) }, body: {} }, result.response);
    return result.record;
  };

  try {
    const first = await visit();
    assert.equal(first.statusCode, 202);
    assert.equal(first.body.tracked, true);
    const visitorCookie = first.headers['Set-Cookie'].split(';')[0];
    assert.match(first.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax/);

    await visit({ cookie: visitorCookie });
    await visit({ country: 'CN' });
    await visit({ userAgent: 'Googlebot' });
    await visit({ host: 'preview.vercel.app' });
    await visit({ privacy: true });

    assert.equal(Number(store.get('wonder:analytics:visitors')), 2);
    assert.equal(Number(store.get('wonder:analytics:views')), 3);
    assert.equal(Number(store.get('wonder:analytics:country:CA:visitors')), 1);
    assert.equal(Number(store.get('wonder:analytics:country:CA:views')), 2);
    assert.equal(Number(store.get('wonder:analytics:country:CN:visitors')), 1);
    assert.equal(Number(store.get('wonder:analytics:country:CN:views')), 1);
    assert.ok(![...store.entries()].some(([key, value]) => `${key}${value}`.includes('203.0.113.7')));

    const unauthorized = responseRecorder();
    await analyticsHandler({ method: 'GET', headers: {} }, unauthorized.response);
    assert.equal(unauthorized.record.statusCode, 401);

    const session = responseRecorder();
    issueSession(session.response, 'admin');
    const adminCookie = session.record.headers['Set-Cookie'].split(';')[0];
    const dashboard = responseRecorder();
    await analyticsHandler({ method: 'GET', headers: { cookie: adminCookie } }, dashboard.response);
    assert.equal(dashboard.record.statusCode, 200);
    assert.deepEqual(dashboard.record.body.totals, { visitors: 2, views: 3 });
    assert.equal(dashboard.record.body.today.visitors, 2);
    assert.equal(dashboard.record.body.today.views, 3);
    assert.deepEqual(dashboard.record.body.countries.map(item => item.code), ['CA', 'CN']);
    assert.equal(dashboard.record.headers['Cache-Control'], 'private, no-store');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

