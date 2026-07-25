import { createHmac, timingSafeEqual } from 'node:crypto';
import { kv, storageConfigured } from './_admin.js';

const COOKIE = 'wonder_user_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(pair => pair.length === 2));
}

function secret() { return process.env.USER_SESSION_SECRET; }
function signature(value) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
function matches(a, b) {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function userConfigured() { return Boolean(storageConfigured() && secret()); }
export function userKey(email) { return `wonder:user:${String(email).trim().toLowerCase()}`; }

export function issueUserSession(res, user) {
  const payload = Buffer.from(JSON.stringify({ email: user.email, name: user.name, expires: Date.now() + MAX_AGE_SECONDS * 1000 })).toString('base64url');
  const token = `${payload}.${signature(payload)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`);
}

export function clearUserSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function getUserSession(req) {
  try {
    if (!userConfigured()) return null;
    const token = cookies(req)[COOKIE];
    if (!token) return null;
    const [payload, received] = token.split('.');
    if (!payload || !received || !matches(received, signature(payload))) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!session.email || !session.name || session.expires <= Date.now()) return null;
    return { email: String(session.email).toLowerCase(), name: String(session.name) };
  } catch { return null; }
}

export async function getCurrentUser(req) {
  const session = getUserSession(req);
  if (!session) return null;
  const raw = await kv('get', userKey(session.email));
  if (!raw) return null;
  const user = JSON.parse(raw);
  return user.email === session.email ? { email: user.email, name: user.name } : null;
}
