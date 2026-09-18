import assert from 'node:assert/strict';
import test from 'node:test';

import appleIAPHandler, { appleCreditProducts, appleIAPCreditScript } from '../api/_apple-iap-route.js';

function responseRecorder() {
  const record = { statusCode: 200, body: null };
  return {
    record,
    response: {
      status(code) { record.statusCode = code; return this; },
      json(body) { record.body = body; return this; }
    }
  };
}

test('Apple consumable product IDs map only to the supported Wonder credit packs', () => {
  assert.deepEqual(appleCreditProducts, {
    'com.wonderadlab.app.credits100': 100,
    'com.wonderadlab.app.credits200': 200,
    'com.wonderadlab.app.credits300': 300,
    'com.wonderadlab.app.credits400': 400,
    'com.wonderadlab.app.credits500': 500
  });
});

test('Apple crediting script is atomic and idempotent', () => {
  assert.match(appleIAPCreditScript, /local existing = redis\.call\('GET', KEYS\[1\]\)/);
  assert.match(appleIAPCreditScript, /redis\.call\('INCRBY', KEYS\[2\], amount\)/);
  assert.match(appleIAPCreditScript, /redis\.call\('SET', KEYS\[1\], ARGV\[2\]\)/);
  assert.match(appleIAPCreditScript, /return \{2, existing, current\}/);
});

test('Apple purchase endpoint requires configured storage and a signed-in account', async () => {
  const keys = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  try {
    const result = responseRecorder();
    await appleIAPHandler({ method: 'POST', headers: {}, body: {} }, result.response);
    assert.equal(result.record.statusCode, 503);
    assert.equal(result.record.body.setup, true);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
