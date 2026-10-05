import assert from 'node:assert/strict';
import test from 'node:test';

import paymentHandler from '../api/payment-confirm.js';

function responseRecorder() {
  const record = { statusCode: 200, body: null };
  return {
    record,
    response: {
      status(code) { record.statusCode = code; return this; },
      json(body) { record.body = body; return this; },
      setHeader() {}
    }
  };
}

test('live webhook setup rejects requests without an authenticated admin session', async () => {
  const keys = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET'];
  const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.KV_REST_API_URL = 'https://mock-kv.invalid';
  process.env.KV_REST_API_TOKEN = 'test-token';
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD = 'test-password';
  process.env.ADMIN_SESSION_SECRET = 'test-session-secret';

  try {
    const result = responseRecorder();
    await paymentHandler({
      method: 'POST',
      query: { action: 'configure-live-webhook' },
      headers: {}
    }, result.response);
    assert.equal(result.record.statusCode, 401);
    assert.deepEqual(result.record.body, { error: 'Admin authentication required' });
  } finally {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
