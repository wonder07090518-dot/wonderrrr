import { clearSession, configured, isAdmin, issueSession, validCredentials } from './_admin.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ authenticated: isAdmin(req), setup: configured() });
  if (req.method === 'DELETE') { clearSession(res); return res.status(200).json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Admin access is not configured', setup: true });
  const { email, password } = req.body || {};
  if (!validCredentials(email, password)) return res.status(401).json({ error: 'Invalid credentials' });
  issueSession(res, email);
  return res.status(200).json({ ok: true });
}
