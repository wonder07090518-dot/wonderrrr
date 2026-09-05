import balanceHandler from './_balance-route.js';
import balancePaymentHandler from './_balance-payment-route.js';
import feedbackHandler from './_feedback-route.js';
import rechargesHandler from './_recharges-route.js';
import appContentHandler from './_app-content-route.js';
import accountDeleteHandler from './_account-delete-route.js';
import analyticsHandler from './_analytics-route.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || new URL(req.url || '/', 'https://wonderadlab.com').searchParams.get('route') || '');
  if (route === 'balance') return balanceHandler(req, res);
  if (route === 'balance-payment') return balancePaymentHandler(req, res);
  if (route === 'feedback') return feedbackHandler(req, res);
  if (route === 'recharges') return rechargesHandler(req, res);
  if (route === 'app-content') return appContentHandler(req, res);
  if (route === 'account-delete') return accountDeleteHandler(req, res);
  if (route === 'analytics') return analyticsHandler(req, res);
  return res.status(404).json({ error: 'Unknown account action' });
}
