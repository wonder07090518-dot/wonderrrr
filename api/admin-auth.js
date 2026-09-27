import { clearSession, configured, isAdmin, issueSession, validCredentials } from './_admin.js';
import {
  clearCommentReviewerSession,
  commentReviewerConfigured,
  isCommentReviewer,
  issueCommentReviewerSession,
  validCommentReviewerCredentials
} from './_comment-reviewer.js';

export default async function handler(req, res) {
  const scope = String(req.query?.scope || new URL(req.url || '/', 'https://wonderadlab.com').searchParams.get('scope') || '');
  if (scope === 'comments') {
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method === 'GET') return res.status(200).json({ authenticated: isCommentReviewer(req), setup: commentReviewerConfigured(), scope: 'comments:read' });
    if (req.method === 'DELETE') { clearCommentReviewerSession(res); return res.status(200).json({ ok: true }); }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!commentReviewerConfigured()) return res.status(503).json({ error: 'Comment review access is not configured', setup: true });
    const { username, password } = req.body || {};
    if (!validCommentReviewerCredentials(username, password)) return res.status(401).json({ error: 'Invalid credentials' });
    issueCommentReviewerSession(res, username);
    return res.status(200).json({ ok: true, scope: 'comments:read' });
  }

  if (req.method === 'GET') return res.status(200).json({ authenticated: isAdmin(req), setup: configured() });
  if (req.method === 'DELETE') { clearSession(res); return res.status(200).json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Admin access is not configured', setup: true });
  const { username, password } = req.body || {};
  if (!validCredentials(username, password)) return res.status(401).json({ error: 'Invalid credentials' });
  issueSession(res, username);
  return res.status(200).json({ ok: true });
}
