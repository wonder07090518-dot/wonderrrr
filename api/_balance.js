import { kv } from './_admin.js';

export const rechargeAmounts = new Set([100, 200, 300, 400, 500]);
export const rechargeMethods = new Set(['微信支付', '支付宝']);

export function rechargeBonus(amount) {
  const value = Number(amount);
  return rechargeAmounts.has(value) ? Math.floor(value / 10) : 0;
}

export function rechargeCredit(amount) {
  const value = Number(amount);
  return rechargeAmounts.has(value) ? value + rechargeBonus(value) : 0;
}

export function balanceKey(email) {
  return `wonder:balance:${String(email || '').trim().toLowerCase()}`;
}

export function testBalanceKey(email) {
  return `wonder:test-balance:${String(email || '').trim().toLowerCase()}`;
}

export function rechargeKey(id) {
  return `wonder:recharge:${String(id || '').trim()}`;
}

export function balancePaymentKey(orderId) {
  return `wonder:balance-payment:${String(orderId || '').trim()}`;
}

export async function loadRecharge(id) {
  const raw = await kv('get', rechargeKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function readBalance(email) {
  const { balance } = await readBalanceBreakdown(email);
  return balance;
}

export async function readBalanceBreakdown(email) {
  const [realRaw, testRaw] = await Promise.all([
    kv('get', balanceKey(email)),
    kv('get', testBalanceKey(email))
  ]);
  const realBalance = Math.max(0, Number(realRaw) || 0);
  const testBalance = Math.max(0, Number(testRaw) || 0);
  return { balance: realBalance + testBalance, realBalance, testBalance };
}
