import Stripe from 'stripe';

export const STRIPE_CURRENCY = 'cny';
export const STRIPE_API_VERSION = '2026-02-25.clover';

let client;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: { name: 'Wonder Ad Lab', version: '1.0.0' }
    });
  }
  return client;
}

export function orderAmountMinor(order) {
  const match = String(order?.price || '').trim().match(/^¥\s*(\d+(?:\.\d{1,2})?)(?:\s*\/|\s*$)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

export function paidSessionMatchesOrder(session, order) {
  const expected = orderAmountMinor(order);
  const expectedSessionId = String(order?.stripeCheckoutSessionId || '');
  return Boolean(
    expected
    && session
    && (!expectedSessionId || session.id === expectedSessionId)
    && session.client_reference_id === order.id
    && session.metadata?.orderId === order.id
    && session.currency === STRIPE_CURRENCY
    && Number(session.amount_total) === expected
    && ['paid', 'no_payment_required'].includes(session.payment_status)
  );
}

export function checkoutIdempotencyKey(order) {
  const attempt = Math.max(0, Number(order?.stripeCheckoutAttempt) || 0);
  return `wonder-checkout-${String(order?.id || '').replace(/[^a-z0-9_-]/gi, '')}-${attempt}`.slice(0, 255);
}
