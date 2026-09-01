import { kv } from './_admin.js';

export const rechargeAmounts = new Set([20, 50, 100, 200]);
export const rechargeMethods = new Set(['微信支付', '支付宝']);

export function balanceKey(email) {
  return `wonder:balance:${String(email || '').trim().toLowerCase()}`;
}

export function rechargeKey(id) {
  return `wonder:recharge:${String(id || '').trim()}`;
}

export async function loadRecharge(id) {
  const raw = await kv('get', rechargeKey(id));
  return raw ? JSON.parse(raw) : null;
}

export async function readBalance(email) {
  return Math.max(0, Number(await kv('get', balanceKey(email))) || 0);
}
