import { createHash, randomBytes } from 'node:crypto';
import { isAdmin, kv, storageConfigured } from './_admin.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const moderationIndex = 'wonder:news-comments:moderation';

function clean(value, length) {
  return String(value || '').trim().slice(0, length).replace(/[\0\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validNewsId(value) { return /^[a-z0-9][a-z0-9-]{1,99}$/i.test(value); }

function fingerprint(req, suffix = '') {
  const address = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return createHash('sha256').update(`${address}|${req.headers?.['user-agent'] || ''}|${suffix}`).digest('hex').slice(0, 24);
}

async function withinRateLimit(req, action, limit) {
  const key = `wonder:news-comment-rate:${action}:${fingerprint(req)}`;
  const count = Number(await kv('incr', key));
  if (count === 1) await kv('expire', key, 86400);
  return count <= limit;
}

async function readItems(index, limit = 199) {
  const ids = await kv('zrevrange', index, 0, limit);
  if (!Array.isArray(ids) || !ids.length) return [];
  const values = await Promise.all(ids.map(id => kv('get', `wonder:news-comment:${id}`)));
  return values.map(value => { try { return JSON.parse(value); } catch { return null; } }).filter(Boolean);
}

function publicComment(item) {
  return { id: item.id, newsId: item.newsId, displayName: item.displayName, body: item.body, createdAt: item.createdAt };
}

async function notifyOwner(item) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `news-comment-${item.id}` },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [OWNER_EMAIL],
      reply_to: item.email,
      subject: `AI 今日评论待审核 · ${item.newsId}`,
      text: `评论编号：${item.id}\n新闻：${item.newsId}\n昵称：${item.displayName}\n联系邮箱：${item.email}\n\n${item.body}\n\n请登录 Wonder 管理后台审核。`
    })
  });
  return response.ok;
}

export default async function newsCommentsHandler(req, res) {
  if (!storageConfigured()) return res.status(503).json({ error: 'Comment storage is not configured', setup: true });

  if (req.method === 'GET') {
    const newsId = clean(req.query?.newsId, 100);
    if (newsId) {
      if (!validNewsId(newsId)) return res.status(400).json({ error: 'Invalid news item' });
      const comments = (await readItems(`wonder:news-comments:${newsId}`, 99))
        .filter(item => item.status === 'approved')
        .map(publicComment)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      return res.status(200).json({ comments });
    }
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ comments: await readItems(moderationIndex) });
  }

  if (req.method === 'POST') {
    const action = clean(req.body?.action, 20);
    if (action === 'report') {
      if (!(await withinRateLimit(req, 'report', 10))) return res.status(429).json({ error: 'Daily report limit reached' });
      const commentId = clean(req.body?.commentId, 40);
      const reason = clean(req.body?.reason, 200) || 'User report';
      if (!/^C\d{10}[a-f0-9]{4}$/.test(commentId)) return res.status(400).json({ error: 'Invalid comment' });
      const raw = await kv('get', `wonder:news-comment:${commentId}`);
      if (!raw) return res.status(404).json({ error: 'Comment not found' });
      const item = JSON.parse(raw);
      const reports = Number(item.reports || 0) + 1;
      const updated = { ...item, reports, lastReportReason: reason, lastReportedAt: new Date().toISOString(), status: reports >= 3 ? 'flagged' : item.status };
      await kv('set', `wonder:news-comment:${commentId}`, JSON.stringify(updated));
      return res.status(200).json({ ok: true });
    }

    if (clean(req.body?.website, 120)) return res.status(201).json({ ok: true });
    const newsId = clean(req.body?.newsId, 100);
    const displayName = clean(req.body?.displayName, 24);
    const email = clean(req.body?.email, 180).toLowerCase();
    const body = clean(req.body?.body, 280);
    if (!validNewsId(newsId) || displayName.length < 2 || !validEmail(email) || body.length < 2) {
      return res.status(400).json({ error: 'Please complete every field' });
    }
    if (/https?:\/\/|www\./i.test(body)) return res.status(400).json({ error: 'Links are not allowed in comments' });
    if (!(await withinRateLimit(req, 'submit', 5))) return res.status(429).json({ error: 'Daily comment limit reached' });

    const id = `C${Date.now().toString().slice(-10)}${randomBytes(2).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const item = { id, newsId, displayName, email, body, status: 'pending', reports: 0, createdAt, fingerprint: fingerprint(req, email) };
    await kv('set', `wonder:news-comment:${id}`, JSON.stringify(item));
    await kv('zadd', moderationIndex, Date.now(), id);
    const emailSent = await notifyOwner(item).catch(() => false);
    return res.status(201).json({ ok: true, id, status: 'pending', emailSent });
  }

  if (req.method === 'PUT') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
    const id = clean(req.body?.id, 40);
    const action = clean(req.body?.action, 20);
    if (!/^C\d{10}[a-f0-9]{4}$/.test(id) || !['approve', 'reject', 'hide'].includes(action)) return res.status(400).json({ error: 'Invalid moderation request' });
    const raw = await kv('get', `wonder:news-comment:${id}`);
    if (!raw) return res.status(404).json({ error: 'Comment not found' });
    const item = JSON.parse(raw);
    const status = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'rejected';
    const updated = { ...item, status, reviewedAt: new Date().toISOString() };
    await kv('set', `wonder:news-comment:${id}`, JSON.stringify(updated));
    if (status === 'approved') await kv('zadd', `wonder:news-comments:${item.newsId}`, new Date(item.createdAt).getTime(), id);
    else await kv('zrem', `wonder:news-comments:${item.newsId}`, id);
    return res.status(200).json({ ok: true, comment: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
