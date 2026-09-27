import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'wonder_comment_reviewer_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function cookies(req) {
  return Object.fromEntries(
    (req.headers?.cookie || '')
      .split(';')
      .map(item => item.trim().split('=').map(decodeURIComponent))
      .filter(pair => pair.length === 2)
  );
}

function credentials() {
  return {
    username: process.env.COMMENT_REVIEW_USERNAME || process.env.ADMIN_USERNAME,
    password: process.env.COMMENT_REVIEW_PASSWORD || process.env.ADMIN_PASSWORD,
    secret: process.env.COMMENT_REVIEW_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  };
}

function matches(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ''));
  const right = Buffer.from(String(rightValue || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function signature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function commentReviewerConfigured() {
  const { username, password, secret } = credentials();
  return Boolean(username && password && secret);
}

export function validCommentReviewerCredentials(username, password) {
  const expected = credentials();
  return Boolean(
    expected.username &&
    expected.password &&
    matches(username, expected.username) &&
    matches(password, expected.password)
  );
}

export function issueCommentReviewerSession(res, username) {
  const { secret } = credentials();
  const payload = Buffer.from(JSON.stringify({
    username,
    scope: 'comments:read',
    expires: Date.now() + MAX_AGE_SECONDS * 1000
  })).toString('base64url');
  const token = `${payload}.${signature(payload, secret)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`);
}

export function clearCommentReviewerSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

export function isCommentReviewer(req) {
  try {
    const { username, secret } = credentials();
    if (!username || !secret) return false;
    const token = cookies(req)[COOKIE];
    if (!token) return false;
    const [payload, received] = token.split('.');
    if (!payload || !received || !matches(received, signature(payload, secret))) return false;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.username === username && session.scope === 'comments:read' && session.expires > Date.now();
  } catch {
    return false;
  }
}
