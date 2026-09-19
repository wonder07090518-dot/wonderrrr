import { createHash, randomBytes } from 'node:crypto';
import { isAdmin, kv, storageConfigured } from './_admin.js';

const OWNER_EMAIL = 'wonder07090518@gmail.com';
const submissionIndex = 'wonder:news-submissions';
const approvedIndex = 'wonder:news-approved';

function clean(value, length) {
  return String(value || '').trim().slice(0, length).replace(/\0/g, '');
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now() + 24 * 60 * 60 * 1000;
}

function validSourceURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && value.length <= 500;
  } catch {
    return false;
  }
}

async function withinRateLimit(req) {
  const address = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const fingerprint = createHash('sha256').update(`${address}|${req.headers?.['user-agent'] || ''}`).digest('hex').slice(0, 24);
  const key = `wonder:news-submit-rate:${fingerprint}`;
  const count = Number(await kv('incr', key));
  if (count === 1) await kv('expire', key, 86400);
  return count <= 5;
}

async function readItems(index, limit = 199) {
  const ids = await kv('zrevrange', index, 0, limit);
  if (!Array.isArray(ids) || !ids.length) return [];
  const values = await Promise.all(ids.map(id => kv('get', `wonder:news-submission:${id}`)));
  return values.map(value => {
    try { return JSON.parse(value); } catch { return null; }
  }).filter(Boolean);
}

async function notifyOwner(item) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `news-submission-${item.id}` },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [OWNER_EMAIL],
      reply_to: item.email,
      subject: `AI 今日待审核投稿 · ${item.titleZH || item.titleEN}`,
      text: `投稿编号：${item.id}\n投稿人：${item.author}\n联系邮箱：${item.email}\n发布日期：${item.date}\n来源：${item.sourceName}\n${item.sourceURL}\n\n中文标题：${item.titleZH}\n英文标题：${item.titleEN}\n\n中文摘要：\n${item.bodyZH}\n\n英文摘要：\n${item.bodyEN}\n\n请登录 Wonder 管理后台审核。`
    })
  });
  return response.ok;
}

function publicNewsItem(item) {
  return {
    id: `community-${item.id.toLowerCase()}`,
    date: item.date,
    titleEN: item.titleEN || item.titleZH || item.title || '',
    titleZH: item.titleZH || item.titleEN || item.title || '',
    bodyEN: item.bodyEN || item.bodyZH || item.summary || '',
    bodyZH: item.bodyZH || item.bodyEN || item.summary || '',
    sourceName: item.sourceName,
    sourceURL: item.sourceURL,
    categoryEN: 'Community submission',
    categoryZH: '社区投稿',
    sourceKind: 'community',
    verified: true,
    symbol: 'person.2.fill'
  };
}

export async function readApprovedNews() {
  if (!storageConfigured()) return [];
  try {
    const items = await readItems(approvedIndex, 99);
    return items.filter(item => item.status === 'approved').map(publicNewsItem);
  } catch {
    return [];
  }
}

export default async function newsSubmissionsHandler(req, res) {
  if (!storageConfigured()) return res.status(503).json({ error: 'News submission storage is not configured', setup: true });

  if (req.method === 'POST') {
    if (clean(req.body?.website, 120)) return res.status(201).json({ ok: true });
    const author = clean(req.body?.author, 80);
    const email = clean(req.body?.email, 180).toLowerCase();
    const legacyTitle = clean(req.body?.title, 120);
    const legacySummary = clean(req.body?.summary, 1200);
    const titleZHInput = clean(req.body?.titleZH, 120);
    const titleENInput = clean(req.body?.titleEN, 120);
    const bodyZHInput = clean(req.body?.bodyZH, 1200);
    const bodyENInput = clean(req.body?.bodyEN, 1200);
    const titleZH = titleZHInput || legacyTitle || titleENInput;
    const titleEN = titleENInput || legacyTitle || titleZHInput;
    const bodyZH = bodyZHInput || legacySummary || bodyENInput;
    const bodyEN = bodyENInput || legacySummary || bodyZHInput;
    const sourceName = clean(req.body?.sourceName, 80);
    const sourceURL = clean(req.body?.sourceURL, 500);
    const date = clean(req.body?.date, 10);
    if (author.length < 2 || !validEmail(email) || titleZH.length < 4 || titleEN.length < 4 || bodyZH.length < 20 || bodyEN.length < 20 || sourceName.length < 2 || !validSourceURL(sourceURL) || !validDate(date)) {
      return res.status(400).json({ error: 'Please complete every field with a valid HTTPS source and publication date' });
    }
    if (!(await withinRateLimit(req))) return res.status(429).json({ error: 'Daily submission limit reached. Please try again tomorrow.' });
    const id = `AI${Date.now().toString().slice(-10)}${randomBytes(2).toString('hex')}`;
    const item = { id, author, email, titleZH, titleEN, bodyZH, bodyEN, sourceName, sourceURL, date, status: 'pending', createdAt: new Date().toISOString() };
    await kv('set', `wonder:news-submission:${id}`, JSON.stringify(item));
    await kv('zadd', submissionIndex, Date.now(), id);
    const emailSent = await notifyOwner(item).catch(() => false);
    return res.status(201).json({ ok: true, id, status: 'pending', emailSent });
  }

  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin authentication required' });
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'GET') {
    return res.status(200).json({ submissions: await readItems(submissionIndex) });
  }

  if (req.method === 'PUT') {
    const id = clean(req.body?.id, 40);
    const action = clean(req.body?.action, 20);
    if (!/^AI\d{10}[a-f0-9]{4}$/.test(id) || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid moderation request' });
    const raw = await kv('get', `wonder:news-submission:${id}`);
    if (!raw) return res.status(404).json({ error: 'Submission not found' });
    const item = JSON.parse(raw);
    const status = action === 'approve' ? 'approved' : 'rejected';
    const updated = { ...item, status, reviewedAt: new Date().toISOString() };
    await kv('set', `wonder:news-submission:${id}`, JSON.stringify(updated));
    if (status === 'approved') await kv('zadd', approvedIndex, new Date(`${item.date}T00:00:00Z`).getTime(), id);
    else await kv('zrem', approvedIndex, id);
    return res.status(200).json({ ok: true, submission: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
