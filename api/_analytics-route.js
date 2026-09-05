import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isAdmin, kv, storageConfigured } from './_admin.js';

const COOKIE = 'wonder_analytics_visitor';
const YEAR_SECONDS = 365 * 24 * 60 * 60;
const RETENTION_SECONDS = 400 * 24 * 60 * 60;
const TRACKED_HOSTS = new Set(['wonderadlab.com', 'www.wonderadlab.com']);
const BOT_PATTERN = /bot|crawler|spider|slurp|headless|preview|lighthouse|pagespeed|uptime|monitoring/i;

function cookies(req) {
  return Object.fromEntries(String(req.headers?.cookie || '').split(';').map(item => item.trim().split('=').map(decodeURIComponent)).filter(pair => pair.length === 2));
}

function analyticsSecret() {
  return process.env.ANALYTICS_SECRET || process.env.ADMIN_SESSION_SECRET || '';
}

function signature(id) {
  return createHmac('sha256', analyticsSecret()).update(id).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function readVisitorId(req) {
  const token = cookies(req)[COOKIE];
  if (!token) return '';
  const [id, received] = token.split('.');
  if (!/^[a-f0-9]{32}$/.test(id || '') || !safeEqual(received, signature(id))) return '';
  return id;
}

function issueVisitorCookie(res, id) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(`${id}.${signature(id)}`)}; Path=/; Max-Age=${YEAR_SECONDS}; HttpOnly; Secure; SameSite=Lax`);
}

function visitorKey(id) {
  return createHmac('sha256', analyticsSecret()).update(`visitor:${id}`).digest('hex').slice(0, 32);
}

function torontoDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function countryCode(req) {
  const value = String(req.headers?.['x-vercel-ip-country'] || req.headers?.['cf-ipcountry'] || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : 'ZZ';
}

function isRealSiteRequest(req) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(':')[0].toLowerCase();
  return TRACKED_HOSTS.has(host);
}

async function recordVisit(req, res) {
  if (!storageConfigured() || !analyticsSecret()) return res.status(503).json({ error: 'Analytics storage is not configured' });
  if (!isRealSiteRequest(req)) return res.status(202).json({ ok: true, tracked: false });
  if (req.headers?.['sec-gpc'] === '1' || req.headers?.dnt === '1' || BOT_PATTERN.test(String(req.headers?.['user-agent'] || ''))) {
    return res.status(202).json({ ok: true, tracked: false });
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const day = torontoDay(now);
  const country = countryCode(req);
  const id = readVisitorId(req) || randomBytes(16).toString('hex');
  issueVisitorCookie(res, id);
  const anonymousId = visitorKey(id);
  const isNewVisitor = Number(await kv('setnx', `wonder:analytics:visitor:${anonymousId}`, JSON.stringify({ firstSeen: timestamp, country }))) === 1;
  const isNewToday = Number(await kv('setnx', `wonder:analytics:day-visitor:${day}:${anonymousId}`, timestamp)) === 1;

  await Promise.all([
    kv('setnx', 'wonder:analytics:started-at', timestamp),
    kv('set', 'wonder:analytics:last-seen', timestamp),
    kv('incr', 'wonder:analytics:views'),
    kv('incr', `wonder:analytics:day:${day}:views`),
    kv('expire', `wonder:analytics:day:${day}:views`, RETENTION_SECONDS),
    kv('expire', `wonder:analytics:day-visitor:${day}:${anonymousId}`, 48 * 60 * 60),
    kv('sadd', 'wonder:analytics:countries', country),
    kv('incr', `wonder:analytics:country:${country}:views`),
    kv('set', `wonder:analytics:country:${country}:last-seen`, timestamp),
    ...(isNewVisitor ? [
      kv('incr', 'wonder:analytics:visitors'),
      kv('incr', `wonder:analytics:country:${country}:visitors`)
    ] : []),
    ...(isNewToday ? [
      kv('incr', `wonder:analytics:day:${day}:visitors`),
      kv('expire', `wonder:analytics:day:${day}:visitors`, RETENTION_SECONDS)
    ] : [])
  ]);

  return res.status(202).json({ ok: true, tracked: true });
}

async function readAnalytics(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!storageConfigured()) return res.status(503).json({ error: 'Analytics storage is not configured', setup: true });
  res.setHeader('Cache-Control', 'private, no-store');
  const day = torontoDay();
  const [visitors, views, todayVisitors, todayViews, startedAt, updatedAt, storedCountries] = await Promise.all([
    kv('get', 'wonder:analytics:visitors'),
    kv('get', 'wonder:analytics:views'),
    kv('get', `wonder:analytics:day:${day}:visitors`),
    kv('get', `wonder:analytics:day:${day}:views`),
    kv('get', 'wonder:analytics:started-at'),
    kv('get', 'wonder:analytics:last-seen'),
    kv('smembers', 'wonder:analytics:countries')
  ]);
  const codes = Array.isArray(storedCountries) ? storedCountries.filter(code => /^[A-Z]{2}$/.test(code)) : [];
  const countries = await Promise.all(codes.map(async code => {
    const [countryVisitors, countryViews, lastSeen] = await Promise.all([
      kv('get', `wonder:analytics:country:${code}:visitors`),
      kv('get', `wonder:analytics:country:${code}:views`),
      kv('get', `wonder:analytics:country:${code}:last-seen`)
    ]);
    return { code, visitors: Number(countryVisitors) || 0, views: Number(countryViews) || 0, lastSeen: lastSeen || null };
  }));
  countries.sort((a, b) => b.visitors - a.visitors || b.views - a.views || a.code.localeCompare(b.code));

  return res.status(200).json({
    source: 'Wonder Ad Lab first-party analytics',
    timezone: 'America/Toronto',
    startedAt: startedAt || null,
    updatedAt: updatedAt || null,
    totals: { visitors: Number(visitors) || 0, views: Number(views) || 0 },
    today: { date: day, visitors: Number(todayVisitors) || 0, views: Number(todayViews) || 0 },
    countries
  });
}

export default async function analyticsHandler(req, res) {
  if (req.method === 'POST') return recordVisit(req, res);
  if (req.method === 'GET') return readAnalytics(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

