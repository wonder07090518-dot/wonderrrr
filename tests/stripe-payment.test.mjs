import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STRIPE_CURRENCY,
  checkoutIdempotencyKey,
  orderAmountMinor,
  paidSessionMatchesOrder
} from '../api/_stripe.js';

test('Stripe amount is derived only from a fixed server order price', () => {
  assert.equal(orderAmountMinor({ price: '¥16 / 张' }), 1600);
  assert.equal(orderAmountMinor({ price: '¥35.50 / 页起' }), 3550);
  assert.equal(orderAmountMinor({ price: 'AI 评估报价' }), 0);
  assert.equal(orderAmountMinor({ price: '16' }), 0);
  assert.equal(orderAmountMinor({ price: '¥0 / 张' }), 0);
});

test('only a paid matching Stripe Checkout Session can mark the order paid', () => {
  const order = { id: 'WA1234567', price: '¥19 / 张' };
  const session = {
    id: 'cs_test_123',
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    currency: STRIPE_CURRENCY,
    amount_total: 1900,
    payment_status: 'paid'
  };
  assert.equal(paidSessionMatchesOrder(session, order), true);
  assert.equal(paidSessionMatchesOrder({ ...session, payment_status: 'unpaid' }, order), false);
  assert.equal(paidSessionMatchesOrder({ ...session, amount_total: 1800 }, order), false);
  assert.equal(paidSessionMatchesOrder({ ...session, currency: 'cad' }, order), false);
  assert.equal(paidSessionMatchesOrder({ ...session, metadata: { orderId: 'WAOTHER' } }, order), false);
});

test('Checkout retries use a stable per-order idempotency key', () => {
  assert.equal(checkoutIdempotencyKey({ id: 'WA1234567' }), 'wonder-checkout-WA1234567-0');
  assert.equal(checkoutIdempotencyKey({ id: 'WA1234567', stripeCheckoutAttempt: 2 }), 'wonder-checkout-WA1234567-2');
  assert.notEqual(
    checkoutIdempotencyKey({ id: 'WA1234567', stripeCheckoutAttempt: 2 }),
    checkoutIdempotencyKey({ id: 'WA1234567', stripeCheckoutAttempt: 3 })
  );
});
