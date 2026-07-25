import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { kv } from './_admin.js';
import { clearUserSession, getCurrentUser, issueUserSession, userConfigured, userKey } from './_user.js';

function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '')); }
function hashPassword(password, salt) { return scryptSync(password, salt, 64).toString('base64'); }
function passwordMatches(password, user) {
  const expected = Buffer.from(user.passwordHash, 'base64');
  const received = Buffer.from(hashPassword(password, user.passwordSalt), 'base64');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const user = await getCurrentUser(req);
    return res.status(200).json({ authenticated: Boolean(user), user, setup: userConfigured() });
  }
  if (req.method === 'DELETE') { clearUserSession(res); return res.status(200).json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!userConfigured()) return res.status(503).json({ error: 'Account service is not configured', setup: true });

  const { action, name, email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!validEmail(normalizedEmail) || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Please provide a valid email and a password of at least 8 characters' });
  const key = userKey(normalizedEmail);
  const raw = await kv('get', key);

  if (action === 'register') {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) return res.status(400).json({ error: 'Name is required' });
    if (raw) return res.status(409).json({ error: 'This email is already registered' });
    const passwordSalt = randomBytes(16).toString('base64');
    const user = { email: normalizedEmail, name: normalizedName.slice(0, 60), passwordSalt, passwordHash: hashPassword(password, passwordSalt), createdAt: new Date().toISOString() };
    await kv('set', key, JSON.stringify(user));
    issueUserSession(res, user);
    return res.status(201).json({ ok: true, user: { email: user.email, name: user.name } });
  }

  if (action === 'login') {
    if (!raw) return res.status(401).json({ error: 'Email or password is incorrect' });
    const user = JSON.parse(raw);
    if (!passwordMatches(password, user)) return res.status(401).json({ error: 'Email or password is incorrect' });
    issueUserSession(res, user);
    return res.status(200).json({ ok: true, user: { email: user.email, name: user.name } });
  }

  return res.status(400).json({ error: 'Invalid account action' });
}
