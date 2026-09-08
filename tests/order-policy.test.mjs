import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canManuallyConfirmPayment,
  isTestOrder,
  paymentEvidence,
  validateStatusTransition
} from '../api/_order-policy.js';

test('production cannot start without verified payment evidence', () => {
  const unpaid = { payment: '安全付款', status: '已支付', price: '¥19 / 张' };
  assert.equal(paymentEvidence(unpaid), null);
  assert.match(validateStatusTransition(unpaid, '制作中'), /Verified payment evidence/);

  const stripePaid = {
    ...unpaid,
    paidAt: '2026-09-08T00:00:00.000Z',
    amountPaid: 19,
    stripeCheckoutSessionId: 'cs_live_verified',
    stripePaymentEventId: 'evt_verified'
  };
  assert.equal(paymentEvidence(stripePaid), 'stripe-webhook');
  assert.equal(validateStatusTransition(stripePaid, '制作中'), null);
});

test('test credit never qualifies as real payment or delivery evidence', () => {
  const testPaid = {
    payment: '余额支付', status: '已支付', price: '¥12 / 张', paidAt: '2026-09-08T00:00:00.000Z',
    amountPaid: 12, fundingSource: 'test', isTest: true, testCreditUsed: true
  };
  assert.equal(isTestOrder(testPaid), true);
  assert.equal(paymentEvidence(testPaid), null);
  assert.match(validateStatusTransition(testPaid, '制作中'), /Test orders are locked/);
  assert.match(validateStatusTransition(testPaid, '已交付'), /Test orders are locked/);
});

test('manual payment confirmation is limited to QR methods and is auditable', () => {
  assert.equal(canManuallyConfirmPayment({ payment: '安全付款' }), false);
  assert.equal(canManuallyConfirmPayment({ payment: '余额支付' }), false);
  assert.equal(canManuallyConfirmPayment({ payment: '微信支付' }), true);
  const confirmed = {
    payment: '微信支付', status: '已支付', manualPaidAt: '2026-09-08T00:00:00.000Z',
    manualPaidBy: 'admin-dashboard', amountPaid: 16
  };
  assert.equal(paymentEvidence(confirmed), 'admin-confirmed-manual');
  assert.equal(validateStatusTransition(confirmed, '制作中'), null);
});

test('delivery status requires payment, Wonder approval and successful email', () => {
  const making = {
    payment: '余额支付', status: '制作中', paidAt: '2026-09-08T00:00:00.000Z',
    amountPaid: 16, fundingSource: 'real'
  };
  assert.match(validateStatusTransition(making, '已交付'), /Wonder approval record/);
  const approved = { ...making, deliveryApprovedAt: '2026-09-08T01:00:00.000Z', deliveryEmailSentAt: '2026-09-08T01:01:00.000Z' };
  assert.equal(validateStatusTransition(approved, '已交付'), null);
});
