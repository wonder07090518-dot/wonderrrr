import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import commentReviewAuthHandler from '../api/admin-auth.js';
import { isAdmin } from '../api/_admin.js';
import { isCommentReviewer } from '../api/_comment-reviewer.js';

function recorder() {
  const record = { statusCode: 200, body: null, headers: {} };
  return {
    record,
    response: {
      status(code) { record.statusCode = code; return this; },
      json(body) { record.body = body; return this; },
      setHeader(name, value) { record.headers[name] = value; }
    }
  };
}

test('comment reviewer receives a long-lived read-only session that is not an admin session', async () => {
  const keys = [
    'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET',
    'COMMENT_REVIEW_USERNAME', 'COMMENT_REVIEW_PASSWORD', 'COMMENT_REVIEW_SESSION_SECRET'
  ];
  const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    ADMIN_USERNAME: 'admin-owner',
    ADMIN_PASSWORD: 'admin-owner-password',
    ADMIN_SESSION_SECRET: 'admin-session-secret',
    COMMENT_REVIEW_USERNAME: 'comment-reader',
    COMMENT_REVIEW_PASSWORD: 'comment-reader-password',
    COMMENT_REVIEW_SESSION_SECRET: 'comment-reader-session-secret'
  });

  try {
    const login = recorder();
    await commentReviewAuthHandler({
      method: 'POST',
      query: { scope: 'comments' },
      headers: {},
      body: { username: 'comment-reader', password: 'comment-reader-password' }
    }, login.response);

    assert.equal(login.record.statusCode, 200);
    assert.equal(login.record.body.scope, 'comments:read');
    assert.match(login.record.headers['Set-Cookie'], /^wonder_comment_reviewer_session=/);
    assert.match(login.record.headers['Set-Cookie'], /HttpOnly/);
    assert.match(login.record.headers['Set-Cookie'], /SameSite=Strict/);
    assert.match(login.record.headers['Set-Cookie'], /Max-Age=2592000/);

    const cookie = login.record.headers['Set-Cookie'].split(';')[0];
    const request = { headers: { cookie } };
    assert.equal(isCommentReviewer(request), true);
    assert.equal(isAdmin(request), false);

    const session = recorder();
    await commentReviewAuthHandler({ method: 'GET', query: { scope: 'comments' }, headers: { cookie } }, session.response);
    assert.deepEqual(session.record.body, { authenticated: true, setup: true, scope: 'comments:read' });

    const logout = recorder();
    await commentReviewAuthHandler({ method: 'DELETE', query: { scope: 'comments' }, headers: { cookie } }, logout.response);
    assert.match(logout.record.headers['Set-Cookie'], /Max-Age=0/);
  } finally {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('comment review page contains no moderation or other admin write controls', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../comment-review.html', import.meta.url), 'utf8'),
    readFile(new URL('../comment-review.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /只读权限/);
  assert.match(html, /不能批准、隐藏、删除评论/);
  assert.match(html, /id="commentList"/);
  assert.doesNotMatch(html, /批准公开|标记已处理|确认实际到账|订单状态/);
  assert.match(script, /api\('\/api\/news-comments'\)/);
  assert.match(script, /\/api\/admin-auth\?scope=comments/);
  assert.doesNotMatch(script, /method:\s*'PUT'/);
  assert.doesNotMatch(script, /\/api\/(orders|recharges|memberships|support|analytics)/);
});
