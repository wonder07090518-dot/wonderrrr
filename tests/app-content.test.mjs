import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/_app-content-route.js';
import { servicePrices } from '../api/_catalog.js';

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; }
  };
}

test('app content exposes the live catalog and bilingual studio updates', () => {
  const res = responseRecorder();
  handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.servicePrices, servicePrices);
  assert.ok(res.payload.news.length >= 3);
  assert.ok(res.payload.news.every(item => item.titleEN && item.titleZH && item.bodyEN && item.bodyZH));
  assert.match(res.headers['Cache-Control'], /s-maxage=300/);
});

test('app content is read-only', () => {
  const res = responseRecorder();
  handler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 405);
});
