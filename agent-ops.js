const loginView = document.querySelector('#loginView');
const dashboard = document.querySelector('#dashboard');
const logout = document.querySelector('#logout');
let timer;

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || '请求失败'), { status: response.status, setup: body.setup });
  return body;
}

function setView(authenticated) {
  loginView.hidden = authenticated;
  dashboard.hidden = !authenticated;
  logout.hidden = !authenticated;
  if (!authenticated && timer) { clearInterval(timer); timer = null; }
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setHealth(id, enabled, readyText, pendingText) {
  const dot = document.querySelector(`#${id}Dot`);
  dot.className = `status-dot ${enabled ? 'on' : 'off'}`;
  document.querySelector(`#${id}Status`).textContent = enabled ? readyText : pendingText;
}

function taskType(item) {
  if (item.kind === 'order' && item.priority === 'ready') return '已付款订单';
  if (item.kind === 'order') return '订单';
  return '人工咨询';
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN');
}

async function loadTasks() {
  try {
    const data = await api('/api/agent-ops');
    setHealth('stripe', data.automation.stripe, '正式回调运行中', '尚未启用正式确认');
    setHealth('wechat', data.automation.wecomCustomerService, '企业微信客服已连接', '等待企业微信 API 连接');
    document.querySelector('#readyCount').textContent = data.counts.ready;
    document.querySelector('#humanCount').textContent = data.counts.human;
    document.querySelector('#waitingCount').textContent = data.counts.waiting;
    document.querySelector('#updated').textContent = `${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 已安全读取`;
    const list = document.querySelector('#taskList');
    list.innerHTML = data.tasks.length ? data.tasks.map(item => `<article class="task">
      <span class="task-type">${escapeHtml(taskType(item))}</span>
      <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.status)} · ${escapeHtml(formatDate(item.createdAt))}</p></div>
      <p class="task-next">${escapeHtml(item.next)}</p>
    </article>`).join('') : '<p class="empty">现在没有需要处理的任务</p>';
  } catch (error) {
    if (error.status === 401) { setView(false); return; }
    document.querySelector('#updated').textContent = error.setup ? '任务存储尚未配置' : `读取失败：${error.message}`;
  }
}

document.querySelector('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const hint = document.querySelector('#loginHint');
  hint.textContent = '正在建立 30 天只读会话…';
  try {
    await api('/api/admin-auth?scope=comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: document.querySelector('#username').value.trim(), password: document.querySelector('#password').value })
    });
    document.querySelector('#password').value = '';
    setView(true);
    await loadTasks();
    timer ||= setInterval(loadTasks, 60_000);
  } catch (error) {
    hint.textContent = error.setup ? '只读运营账号尚未配置' : '账号或密码不正确';
  }
});

document.querySelector('#refresh').addEventListener('click', loadTasks);
logout.addEventListener('click', async () => {
  await fetch('/api/admin-auth?scope=comments', { method: 'DELETE', credentials: 'same-origin' });
  setView(false);
});

(async () => {
  try {
    const session = await api('/api/admin-auth?scope=comments');
    if (!session.authenticated) return;
    setView(true);
    await loadTasks();
    timer = setInterval(loadTasks, 60_000);
  } catch { setView(false); }
})();
