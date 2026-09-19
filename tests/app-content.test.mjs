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

test('app content exposes the live catalog, studio updates and verified AI news', async () => {
  const res = responseRecorder();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.servicePrices, servicePrices);
  assert.equal(res.payload.news.length, 22);
  assert.ok(res.payload.news.every(item => item.titleEN && item.titleZH && item.bodyEN && item.bodyZH));
  assert.equal(new Set(res.payload.news.map(item => item.id)).size, res.payload.news.length);
  assert.deepEqual(
    res.payload.news.map(item => item.date),
    res.payload.news.map(item => item.date).toSorted().reverse()
  );
  assert.equal(res.payload.news.at(0).id, 'wonder-ilabs-social');
  assert.equal(res.payload.news.at(-1).id, 'website-launch');
  assert.equal(res.payload.updatedAt, '2026-09-18');
  assert.equal(res.payload.industryNews.length, 15);
  assert.ok(res.payload.industryNews.every(item =>
    item.titleEN && item.titleZH && item.bodyEN && item.bodyZH &&
    item.categoryEN && item.categoryZH && item.verified === true &&
    /^https:\/\//.test(item.sourceURL)
  ));
  assert.equal(new Set(res.payload.industryNews.map(item => item.id)).size, res.payload.industryNews.length);
  assert.deepEqual(
    res.payload.industryNews.map(item => item.date),
    res.payload.industryNews.map(item => item.date).toSorted().reverse()
  );
  assert.equal(res.payload.industryNews.at(0).id, 'openai-gpt-6-astra');
  assert.equal(res.payload.industryNews.at(-1).id, 'nvidia-cosmos');
  assert.deepEqual(
    new Set(res.payload.industryNews.map(item => item.sourceName)),
    new Set(['OpenAI', 'Google', 'Anthropic', 'Apple', 'Meta AI', 'Google DeepMind', 'NVIDIA'])
  );
  assert.match(res.payload.industryNews.at(0).bodyZH, /宣传片创意、脚本、分镜与制作流程/);
  assert.match(res.payload.industryNews.at(0).bodyZH, /成片仍需由专门的视频生成或剪辑工具完成/);
  assert.match(res.payload.industryNews.at(0).bodyEN, /finished footage still requires a dedicated video-generation or editing tool/);
  assert.match(res.headers['Cache-Control'], /s-maxage=60/);
});

test('app content is read-only', async () => {
  const res = responseRecorder();
  await handler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 405);
});
