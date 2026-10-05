import { kv } from '../api/_admin.js';
import { stripeClient } from '../api/_stripe.js';

const endpointUrl = 'https://www.wonderadlab.com/api/payment-confirm?action=webhook';
const secretKey = 'wonder:stripe:webhook-secret:live';
const enabledEvents = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded'
];

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping live Stripe webhook maintenance outside production.');
  process.exit(0);
}

if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
  throw new Error('The production deployment is not connected to a live Stripe account.');
}

const stripe = stripeClient();
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existing = endpoints.data.find(
  endpoint => endpoint.url === endpointUrl && endpoint.status === 'enabled'
);
const storedSecret = await kv('get', secretKey);

if (existing) {
  await stripe.webhookEndpoints.update(existing.id, { enabled_events: enabledEvents });
  if (!storedSecret) {
    throw new Error('The live webhook exists, but its signing secret is not available in secure storage.');
  }
  console.log('Verified the live Stripe webhook and its two signed checkout events.');
  process.exit(0);
}

const endpoint = await stripe.webhookEndpoints.create({
  url: endpointUrl,
  enabled_events: enabledEvents,
  description: 'Wonder Ad Lab signed live checkout confirmation'
});

if (!endpoint.secret) {
  throw new Error('Stripe did not return a signing secret for the live webhook.');
}

await kv('set', secretKey, endpoint.secret);
console.log('Created the live Stripe webhook and stored its signing secret securely.');
