import balanceHandler from './_balance-route.js';
import feedbackHandler from './_feedback-route.js';
import rechargesHandler from './_recharges-route.js';

export default async function handler(req, res) {
  const route = String(req.query?.route || new URL(req.url || '/', 'https://wonderadlab.com').searchParams.get('route') || '');
  if (route === 'balance') return balanceHandler(req, res);
  if (route === 'feedback') return feedbackHandler(req, res);
  if (route === 'recharges') return rechargesHandler(req, res);
  return res.status(404).json({ error: 'Unknown account action' });
}
