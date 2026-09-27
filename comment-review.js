const loginView = document.querySelector('#loginView');
const dashboard = document.querySelector('#dashboard');
const notice = document.querySelector('#notice');
const commentList = document.querySelector('#commentList');
const logoutButton = document.querySelector('#logout');
let comments = [];
let activeFilter = 'recent';
let refreshTimer = null;

function setView(authenticated) {
  loginView.hidden = authenticated;
  dashboard.hidden = !authenticated;
  logoutButton.hidden = !authenticated;
  if (!authenticated && refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || '请求失败'), { code: response.status, setup: body.setup });
  return body;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timestamp(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecent(item) {
  const age = Date.now() - timestamp(item.createdAt);
  return age >= 0 && age <= 24 * 60 * 60 * 1000;
}

function needsAttention(item) {
  return ['pending', 'flagged'].includes(item.status) || Number(item.reports) > 0;
}

function statusLabel(status) {
  return status === 'approved' ? '已公开' : status === 'hidden' ? '已隐藏' : status === 'rejected' ? '已拒绝' : status === 'flagged' ? '被举报' : '待安全检查';
}

function riskLabel(value) {
  return ({ abuse: '辱骂', threat: '威胁', sexual: '色情', 'personal-data': '个人联系方式' })[value] || value;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN');
}

function filteredComments() {
  if (activeFilter === 'recent') return comments.filter(isRecent);
  if (activeFilter === 'attention') return comments.filter(needsAttention);
  return comments;
}

function render() {
  const recent = comments.filter(isRecent);
  const attention = comments.filter(needsAttention);
  document.querySelector('#recentCount').textContent = recent.length;
  document.querySelector('#attentionCount').textContent = attention.length;
  document.querySelector('#totalCount').textContent = comments.length;

  const visible = filteredComments();
  notice.textContent = `${formatDate(new Date().toISOString())} 已读取 · 当前显示 ${visible.length} 条`;
  if (!visible.length) {
    commentList.innerHTML = `<p class="empty">${activeFilter === 'attention' ? '目前没有需要留意的评论。' : activeFilter === 'recent' ? '过去 24 小时没有新评论。' : '暂时没有评论。'}</p>`;
    return;
  }

  commentList.innerHTML = visible.map(item => {
    const flags = Array.isArray(item.moderationFlags) ? item.moderationFlags.map(riskLabel) : [];
    const reportCount = Number(item.reports) || 0;
    return `<article class="comment-card is-${escapeHtml(item.status || 'pending')}">
      <span class="status">${escapeHtml(statusLabel(item.status))}</span>
      <div>
        <h2>${escapeHtml(item.displayName || '匿名读者')}</h2>
        <p class="body">${escapeHtml(item.body)}</p>
        <div class="meta">
          <span>新闻 ID：${escapeHtml(item.newsId)}</span>
          <span>提交：${escapeHtml(formatDate(item.createdAt))}</span>
          ${reportCount ? `<span class="risk">举报 ${reportCount} 次</span>` : ''}
          ${flags.length ? `<span class="risk">风险类型：${escapeHtml(flags.join('、'))}</span>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');
}

async function loadComments() {
  notice.textContent = '正在读取评论…';
  try {
    const data = await api('/api/news-comments');
    comments = (data.comments || []).sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt));
    render();
  } catch (error) {
    if (error.code === 401) {
      setView(false);
      document.querySelector('#loginHint').textContent = '只读登录已过期，请重新登录。';
      return;
    }
    notice.textContent = error.setup ? '评论存储尚未配置。' : `无法读取评论：${error.message}`;
  }
}

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    render();
  });
});

document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const hint = document.querySelector('#loginHint');
  hint.textContent = '正在安全登录…';
  try {
    await api('/api/admin-auth?scope=comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.querySelector('#username').value.trim(),
        password: document.querySelector('#password').value
      })
    });
    document.querySelector('#password').value = '';
    setView(true);
    await loadComments();
    if (!refreshTimer) refreshTimer = window.setInterval(loadComments, 5 * 60 * 1000);
  } catch (error) {
    hint.textContent = error.setup ? '只读巡查账号尚未配置。' : '账号或密码不正确。';
  }
});

document.querySelector('#refresh').addEventListener('click', loadComments);
logoutButton.addEventListener('click', async () => {
  await fetch('/api/admin-auth?scope=comments', { method: 'DELETE', credentials: 'same-origin' });
  setView(false);
});

(async () => {
  try {
    const session = await api('/api/admin-auth?scope=comments');
    if (!session.authenticated) return;
    setView(true);
    await loadComments();
    refreshTimer = window.setInterval(loadComments, 5 * 60 * 1000);
  } catch {
    setView(false);
  }
})();
