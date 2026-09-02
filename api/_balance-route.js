import { kv, storageConfigured } from './_admin.js';
import { getCurrentUser } from './_user.js';
import { loadRecharge, readBalance } from './_balance.js';

export default async function balanceHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Balance storage is not configured', setup: true });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to view your balance' });
  const ids = await kv('zrevrange', 'wonder:recharges', 0, 99);
  const recharges = (await Promise.all((ids || []).map(loadRecharge)))
    .filter(item => item && String(item.email).toLowerCase() === user.email)
    .slice(0, 10)
    .map(item => ({ id: item.id, amount: item.amount, bonusAmount: item.bonusAmount || 0, creditedAmount: item.creditedAmount, payment: item.payment, status: item.status, requestedAt: item.requestedAt, approvedAt: item.approvedAt || '' }));
  return res.status(200).json({ balance: await readBalance(user.email), recharges });
}
