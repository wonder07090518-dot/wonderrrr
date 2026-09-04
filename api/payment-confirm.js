import { kv, storageConfigured } from './_admin.js';
import { getCurrentUser } from './_user.js';
import {
  STRIPE_CURRENCY,
  checkoutIdempotencyKey,
  orderAmountMinor,
  paidSessionMatchesOrder,
  stripeClient,
  stripeConfigured
} from './_stripe.js';

export const config = { api: { bodyParser: false } };

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const SITE_ORIGIN = 'https://www.wonderadlab.com';
const manualPaymentMethods = new Set(['微信支付', '支付宝']);

async function loadOrder(id) {
  const raw = await kv('get', `wonder:order:${id}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveOrder(order) {
  await kv('set', `wonder:order:${order.id}`, JSON.stringify(order));
}

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body));
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function jsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const body = await rawBody(req);
  if (!body.length) return {};
  try { return JSON.parse(body.toString('utf8')); }
  catch { throw Object.assign(new Error('Invalid JSON body'), { status: 400 }); }
}

async function notifyOwner(order, kind) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const stripePaid = kind === 'stripe-paid';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${stripePaid ? 'stripe-paid' : 'payment-confirm'}-${order.id}`
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [OWNER_EMAIL],
      subject: stripePaid ? `Wonder Ad Lab Stripe 已收款 ${order.id}` : `Wonder Ad Lab 客户已确认付款 ${order.id}`,
      text: stripePaid
        ? `Stripe 官方回调已确认到账，订单已自动标记为“已支付”。\n\n订单号：${order.id}\n项目：${order.service}\n项目价格：${order.price}\n客户邮箱：${order.email}`
        : `客户提交了付款确认，请核对实际到账后再将订单改为“已支付”。\n\n订单号：${order.id}\n项目：${order.service}\n项目价格：${order.price}\n支付方式：${order.payment}\n客户邮箱：${order.email}`,
      reply_to: order.email
    })
  });
  return response.ok;
}

function userOwnsOrder(user, order) {
  return Boolean(user && order && String(order.email).toLowerCase() === user.email);
}

async function createCheckout(req, res, body) {
  if (!stripeConfigured()) return res.status(503).json({ error: 'Secure checkout is still being connected', setup: true });
  const stripeTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  if (!stripeTestMode && process.env.STRIPE_ENABLE_LIVE !== 'true') {
    return res.status(503).json({ error: 'Live Stripe payments are intentionally disabled until testing is complete', setup: true });
  }
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in before paying' });
  const orderId = String(body?.orderId || '').trim().slice(0, 40);
  const order = orderId ? await loadOrder(orderId) : null;
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!userOwnsOrder(user, order)) return res.status(403).json({ error: 'This order does not belong to your account' });
  if (order.status === '已支付') return res.status(409).json({ error: 'This order is already paid' });
  if (order.turnaround === 'rush-request') return res.status(409).json({ error: 'Wait for the rush quote before paying' });
  if (!['审核中', '待支付', '待确认支付'].includes(order.status)) return res.status(409).json({ error: 'This order is not ready for payment' });
  const amount = orderAmountMinor(order);
  if (!amount) return res.status(409).json({ error: 'This order needs a confirmed fixed quote before payment' });

  const stripe = stripeClient();
  const expectedMode = stripeTestMode ? 'test' : 'live';
  let checkoutAttempt = Math.max(0, Number(order.stripeCheckoutAttempt) || 0);
  if (order.stripeCheckoutSessionId && order.stripeCheckoutMode === expectedMode) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
      if (existing.status === 'open' && existing.url) {
        return res.status(200).json({ url: existing.url, mode: expectedMode, reused: true });
      }
      if (existing.payment_status === 'paid') {
        return res.status(409).json({ error: 'Stripe has received this payment and the signed result is being confirmed' });
      }
      checkoutAttempt += 1;
    } catch {
      checkoutAttempt += 1;
    }
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: order.id,
    customer_email: user.email,
    automatic_payment_methods: { enabled: true },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: STRIPE_CURRENCY,
        unit_amount: amount,
        product_data: {
          name: `Wonder Ad Lab · ${order.service}`,
          description: `${order.size} · ${order.style}`.slice(0, 500)
        }
      }
    }],
    metadata: { orderId: order.id, source: 'wonderadlab-web' },
    payment_intent_data: { metadata: { orderId: order.id, source: 'wonderadlab-web' } },
    success_url: `${SITE_ORIGIN}/payment.html?id=${encodeURIComponent(order.id)}&stripe=return`,
    cancel_url: `${SITE_ORIGIN}/payment.html?id=${encodeURIComponent(order.id)}&stripe=cancel`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60
  }, { idempotencyKey: checkoutIdempotencyKey({ ...order, stripeCheckoutAttempt: checkoutAttempt }) });

  if (!session.url) return res.status(502).json({ error: 'Stripe did not return a checkout URL' });
  const updatedOrder = {
    ...order,
    payment: '安全付款',
    status: '待支付',
    stripeCheckoutSessionId: session.id,
    stripeCheckoutAmount: amount,
    stripeCheckoutCurrency: STRIPE_CURRENCY,
    stripeCheckoutMode: expectedMode,
    stripeCheckoutAttempt: checkoutAttempt,
    updatedAt: new Date().toISOString()
  };
  await saveOrder(updatedOrder);
  return res.status(200).json({ url: session.url, mode: updatedOrder.stripeCheckoutMode });
}

async function paymentStatus(req, res) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to view payment status' });
  const orderId = String(req.query?.orderId || '').trim().slice(0, 40);
  const order = orderId ? await loadOrder(orderId) : null;
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!userOwnsOrder(user, order)) return res.status(403).json({ error: 'This order does not belong to your account' });
  return res.status(200).json({
    orderId: order.id,
    service: order.service,
    price: order.price,
    status: order.status,
    paid: order.status === '已支付',
    payment: order.payment,
    mode: order.stripeCheckoutMode || null
  });
}

async function stripeWebhook(req, res) {
  if (!stripeConfigured()) return res.status(503).json({ error: 'Stripe webhook is not configured' });
  const signature = req.headers?.['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing Stripe signature' });
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(await rawBody(req), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: 'Invalid Stripe signature' });
  }
  if (event.livemode && process.env.STRIPE_ENABLE_LIVE !== 'true') {
    return res.status(409).json({ error: 'Live Stripe processing is disabled' });
  }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return res.status(200).json({ received: true, ignored: true });
  }
  const session = event.data.object;
  const orderId = String(session.metadata?.orderId || session.client_reference_id || '').trim().slice(0, 40);
  const order = orderId ? await loadOrder(orderId) : null;
  if (!order) return res.status(200).json({ received: true, ignored: true });
  if (!paidSessionMatchesOrder(session, order)) return res.status(400).json({ error: 'Checkout details do not match the order' });
  const alreadyProcessed = order.status === '已支付' && order.stripeCheckoutSessionId === session.id;
  if (alreadyProcessed) return res.status(200).json({ received: true, duplicate: true });
  const updatedOrder = {
    ...order,
    payment: '安全付款',
    status: '已支付',
    paidAt: order.paidAt || new Date().toISOString(),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
    stripePaymentEventId: event.id,
    updatedAt: new Date().toISOString()
  };
  await saveOrder(updatedOrder);
  let emailSent = true;
  try { emailSent = await notifyOwner(updatedOrder, 'stripe-paid'); } catch { emailSent = false; }
  return res.status(200).json({ received: true, paid: true, emailSent });
}

async function manualConfirmation(req, res, body) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in before confirming payment' });
  const orderId = String(body?.orderId || '').trim().slice(0, 40);
  const payment = String(body?.payment || '').trim();
  if (!orderId || !manualPaymentMethods.has(payment)) return res.status(400).json({ error: 'Missing payment confirmation details' });
  const order = await loadOrder(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (!userOwnsOrder(user, order)) return res.status(403).json({ error: 'This order does not belong to your account' });
  if (!['审核中', '待支付', '待确认支付'].includes(order.status)) return res.status(409).json({ error: 'This order cannot be confirmed for payment in its current status' });
  const firstConfirmation = order.status !== '待确认支付' || !order.paymentConfirmedAt;
  const updatedOrder = { ...order, payment, status: '待确认支付', paymentConfirmedAt: order.paymentConfirmedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  await saveOrder(updatedOrder);
  let emailSent = true;
  if (firstConfirmation) {
    try { emailSent = await notifyOwner(updatedOrder, 'manual-confirm'); } catch { emailSent = false; }
  }
  return res.status(200).json({ ok: true, status: updatedOrder.status, emailSent });
}

export default async function handler(req, res) {
  if (!storageConfigured()) return res.status(503).json({ error: 'Order storage is not configured', setup: true });
  const action = String(req.query?.action || 'manual');
  if (req.method === 'GET' && action === 'status') return paymentStatus(req, res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (action === 'webhook') return stripeWebhook(req, res);
  let body;
  try { body = await jsonBody(req); }
  catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
  if (action === 'create-checkout') return createCheckout(req, res, body);
  return manualConfirmation(req, res, body);
}
