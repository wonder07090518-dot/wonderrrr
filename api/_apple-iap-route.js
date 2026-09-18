import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { kv, storageConfigured } from './_admin.js';
import { appleRootCertificates } from './_apple-root-certificates.js';
import { balanceKey, readBalanceBreakdown } from './_balance.js';
import { getCurrentUser } from './_user.js';

const BUNDLE_ID = 'com.wonderadlab.app';
const APP_APPLE_ID = 6809796873;

export const appleCreditProducts = Object.freeze({
  'com.wonderadlab.app.credits100': 100,
  'com.wonderadlab.app.credits200': 200,
  'com.wonderadlab.app.credits300': 300,
  'com.wonderadlab.app.credits400': 400,
  'com.wonderadlab.app.credits500': 500
});

export const appleIAPCreditScript = `
local existing = redis.call('GET', KEYS[1])
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
if existing then
  return {2, existing, current}
end
local amount = tonumber(ARGV[1])
if not amount or amount <= 0 then
  return {0, '', current}
end
local nextBalance = redis.call('INCRBY', KEYS[2], amount)
redis.call('SET', KEYS[1], ARGV[2])
return {1, ARGV[2], nextBalance}
`;

function transactionKey(transactionId) {
  return `wonder:apple-iap:${String(transactionId || '').trim()}`;
}

async function verifyTransaction(signedTransaction) {
  const verifiers = [
    new SignedDataVerifier(appleRootCertificates, true, Environment.PRODUCTION, BUNDLE_ID, APP_APPLE_ID),
    new SignedDataVerifier(appleRootCertificates, true, Environment.SANDBOX, BUNDLE_ID)
  ];
  let lastError;
  for (const verifier of verifiers) {
    try { return await verifier.verifyAndDecodeTransaction(signedTransaction); }
    catch (error) { lastError = error; }
  }
  throw lastError || new Error('Apple transaction verification failed');
}

export default async function appleIAPHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Balance storage is not configured', setup: true });
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in before purchasing Wonder credit' });

  const signedTransaction = String(req.body?.signedTransaction || '').trim();
  if (signedTransaction.length < 100 || signedTransaction.length > 50_000 || signedTransaction.split('.').length !== 3) {
    return res.status(400).json({ error: 'Invalid Apple transaction' });
  }

  let transaction;
  try { transaction = await verifyTransaction(signedTransaction); }
  catch { return res.status(400).json({ error: 'Apple could not verify this transaction' }); }

  const transactionId = String(transaction.transactionId || '');
  const productId = String(transaction.productId || '');
  const credit = appleCreditProducts[productId];
  if (!transactionId || !credit || transaction.bundleId !== BUNDLE_ID || transaction.revocationDate) {
    return res.status(400).json({ error: 'This Apple transaction is not eligible for Wonder credit' });
  }
  if (transaction.quantity && Number(transaction.quantity) !== 1) {
    return res.status(400).json({ error: 'Unsupported Apple purchase quantity' });
  }

  const record = {
    transactionId,
    originalTransactionId: String(transaction.originalTransactionId || transactionId),
    productId,
    email: user.email,
    credit,
    environment: String(transaction.environment || ''),
    purchaseDate: transaction.purchaseDate || null,
    creditedAt: new Date().toISOString()
  };
  const result = await kv(
    'eval',
    appleIAPCreditScript,
    2,
    transactionKey(transactionId),
    balanceKey(user.email),
    credit,
    JSON.stringify(record)
  );
  const code = Number(result?.[0]);
  let stored;
  try { stored = JSON.parse(String(result?.[1] || '{}')); }
  catch { stored = null; }
  if (![1, 2].includes(code) || !stored) return res.status(503).json({ error: 'Apple purchase could not be credited' });
  if (String(stored.email || '').toLowerCase() !== user.email) {
    return res.status(409).json({ error: 'This Apple transaction was already used by another account' });
  }

  const balances = await readBalanceBreakdown(user.email);
  return res.status(200).json({
    ok: true,
    alreadyCredited: code === 2,
    creditedAmount: Number(stored.credit) || credit,
    productId,
    transactionId,
    ...balances
  });
}
