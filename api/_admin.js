import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'wonder_admin_session';
function cookies(req) { return Object.fromEntries((req.headers.cookie || '').split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(pair => pair.length === 2)); }
function secret() { return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD; }
function signature(value) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
function matches(a, b) { const left = Buffer.from(String(a)); const right = Buffer.from(String(b)); return left.length === right.length && timingSafeEqual(left, right); }
export function configured() { return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && secret()); }
export function storageConfigured() { return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN); }
export function issueSession(res, username) { const payload = Buffer.from(JSON.stringify({ username, expires: Date.now() + 1000 * 60 * 60 * 12 })).toString('base64url'); const token = `${payload}.${signature(payload)}`; res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`); }
export function clearSession(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`); }
export function isAdmin(req) { try { const token = cookies(req)[COOKIE]; if (!token) return false; const [payload, received] = token.split('.'); if (!payload || !received || !matches(received, signature(payload))) return false; const session = JSON.parse(Buffer.from(payload, 'base64url').toString()); return session.username === process.env.ADMIN_USERNAME && session.expires > Date.now(); } catch { return false; } }
export function validCredentials(username, password) { return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && matches(username, process.env.ADMIN_USERNAME) && matches(password, process.env.ADMIN_PASSWORD)); }
export async function kv(command, ...args) { const base = process.env.KV_REST_API_URL; const token = process.env.KV_REST_API_TOKEN; if (!base || !token) throw new Error('Storage not configured'); const path = [command, ...args.map(value => encodeURIComponent(String(value)))].join('/'); const response = await fetch(`${base.replace(/\/$/, '')}/${path}`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error('Storage request failed'); const data = await response.json(); return data.result; }
