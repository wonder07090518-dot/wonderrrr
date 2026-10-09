import assert from 'node:assert/strict';
import test from 'node:test';
import supportHandler, { answerSupportQuestion } from '../api/_support-route.js';

function response() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name] = value; }
  };
}

test('verified support topics answer in the requested language', () => {
  const pricing = answerSupportQuestion('海报怎么收费？', 'zh');
  assert.equal(pricing.handled, true);
  assert.equal(pricing.category, 'pricing');
  assert.match(pricing.answer, /¥19\/张/);

  const delivery = answerSupportQuestion('How long is delivery after payment?', 'en');
  assert.equal(delivery.handled, true);
  assert.equal(delivery.category, 'turnaround');
  assert.match(delivery.answer, /24 hours/);
});

test('customer acquisition questions lead to the correct conversion path', () => {
  const recommendation = answerSupportQuestion('我不知道选什么，帮我选择服务', 'zh');
  assert.equal(recommendation.handled, true);
  assert.equal(recommendation.category, 'recommendation');
  assert.deepEqual(recommendation.action, { href: '#services', label: '查看服务与价格' });

  const project = answerSupportQuestion('I want to start a project', 'en');
  assert.equal(project.handled, true);
  assert.equal(project.category, 'start-project');
  assert.deepEqual(project.action, { href: '#order', label: 'Start your project' });

  const servicesZH = answerSupportQuestion('你们提供什么服务？', 'zh');
  assert.equal(servicesZH.handled, true);
  assert.equal(servicesZH.category, 'services');
  assert.match(servicesZH.answer, /海报/);

  const servicesEN = answerSupportQuestion('What services do you offer?', 'en');
  assert.equal(servicesEN.handled, true);
  assert.equal(servicesEN.category, 'services');
  assert.match(servicesEN.answer, /posters/);
});

test('support never guesses payment confirmation or real order status', () => {
  const payment = answerSupportQuestion('帮我确认付款到账了吗', 'zh');
  assert.equal(payment.handled, true);
  assert.equal(payment.category, 'payment');
  assert.match(payment.answer, /官方回调或后台核验记录/);

  const status = answerSupportQuestion('我的订单现在做到哪了', 'zh');
  assert.equal(status.handled, true);
  assert.equal(status.category, 'order-status');
  assert.match(status.answer, /不会猜测订单进度/);
});

test('unknown and explicit human questions require escalation', () => {
  assert.equal(answerSupportQuestion('你觉得蓝色好还是紫色好', 'zh').handled, false);
  const human = answerSupportQuestion('我要找人工客服', 'zh');
  assert.equal(human.handled, false);
  assert.equal(human.needsHuman, true);
});

test('known questions work without storage and unknown questions request an email first', async () => {
  const known = response();
  await supportHandler({ method: 'POST', headers: {}, body: { question: '怎么申请修改？', language: 'zh' } }, known);
  assert.equal(known.statusCode, 200);
  assert.equal(known.body.handled, true);

  const unknown = response();
  await supportHandler({ method: 'POST', headers: {}, body: { question: '能不能做一个完全定制的长期合作方案', language: 'zh' } }, unknown);
  assert.equal(unknown.statusCode, 200);
  assert.equal(unknown.body.needsEmail, true);
});
