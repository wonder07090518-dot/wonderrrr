import { spawnSync } from 'node:child_process';
import Stripe from 'stripe';

const endpointUrl = 'https://www.wonderadlab.com/api/payment-confirm?action=webhook';
const enabledEvents = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded'
];

if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  throw new Error('A Stripe sandbox secret key is required. Live keys are intentionally rejected.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  appInfo: { name: 'Wonder Ad Lab setup', version: '1.0.0' }
});

const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existing = endpoints.data.find(endpoint => endpoint.url === endpointUrl && endpoint.status === 'enabled');

if (existing && process.env.STRIPE_WEBHOOK_SECRET) {
  await stripe.webhookEndpoints.update(existing.id, { enabled_events: enabledEvents });
  console.log(JSON.stringify({ status: 'ready', endpoint: endpointUrl, reused: true }));
  process.exit(0);
}

if (existing) {
  throw new Error('The webhook already exists, but its signing secret is not available locally. Pull the Vercel environment and retry.');
}

const endpoint = await stripe.webhookEndpoints.create({
  url: endpointUrl,
  enabled_events: enabledEvents,
  description: 'Wonder Ad Lab signed checkout confirmation'
});

if (!endpoint.secret) throw new Error('Stripe did not return a webhook signing secret.');

const result = spawnSync(
  'npx',
  ['vercel', 'env', 'add', 'STRIPE_WEBHOOK_SECRET', 'production,preview,development', '--sensitive', '--force', '--yes'],
  { input: `${endpoint.secret}\n`, cwd: process.cwd(), encoding: 'utf8' }
);

if (result.status !== 0) {
  throw new Error(`The webhook was created, but Vercel could not store its signing secret: ${result.stderr || result.stdout}`);
}

console.log(JSON.stringify({ status: 'ready', endpoint: endpointUrl, reused: false }));
