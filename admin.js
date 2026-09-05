const loginView = document.querySelector('#loginView');
const dashboard = document.querySelector('#dashboard');
const notice = document.querySelector('#notice');
let currentOrders = [];
let currentRecharges = [];
let dashboardRefreshTimer = null;
let currentAnalytics = null;

function statusClass(status) { return status === '已交付' ? 'is-done' : ['制作中', '修改中'].includes(status) ? 'is-making' : status === '修改申请' ? 'is-revision' : 'is-pending'; }
function setView(loggedIn) { loginView.hidden = loggedIn; dashboard.hidden = !loggedIn; document.querySelector('#logout').hidden = !loggedIn; if (!loggedIn) stopDashboardRefresh(); }
function setNotice(message) { notice.textContent = message; }
async function api(path, options = {}) { const response = await fetch(path, { credentials: 'same-origin', ...options }); const body = await response.json().catch(() => ({})); if (!response.ok) throw Object.assign(new Error(body.error || '请求失败'), { code: response.status, setup: body.setup }); return body; }
function formatBytes(bytes) { if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`; if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`; if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`; return `${bytes || 0} B`; }
function orderTimestamp(order) {
  const value = order.createdAt || (order.date ? order.date.replace(' ', 'T') : '');
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
function isNewOrder(order) { const timestamp = orderTimestamp(order); const age = Date.now() - timestamp; return timestamp > 0 && age >= 0 && age <= 24 * 60 * 60 * 1000; }
function startDashboardRefresh() { stopDashboardRefresh(); dashboardRefreshTimer = window.setInterval(() => loadDashboard(true), 60 * 1000); }
function stopDashboardRefresh() { if (dashboardRefreshTimer) window.clearInterval(dashboardRefreshTimer); dashboardRefreshTimer = null; }
async function downloadReference(order, index) {
  const downloadWindow = window.open('about:blank', '_blank');
  if (downloadWindow) downloadWindow.opener = null;
  try {
    setNotice('正在生成安全下载链接…');
    const data = await api('/api/orders?action=reference-download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, index }) });
    if (downloadWindow) downloadWindow.location.replace(data.url); else window.location.assign(data.url);
    setNotice(`已为 ${data.name} 生成 10 分钟有效的下载链接。`);
  } catch (error) {
    downloadWindow?.close();
    setNotice(`参考文件下载失败：${error.message}`);
  }
}
function renderOrders() {
  const list = document.querySelector('#orders'); list.innerHTML = '';
  const counts = { new24h: 0, pending: 0, revisions: 0, making: 0, done: 0 };
  currentOrders.forEach(order => { if (isNewOrder(order)) counts.new24h++; if (order.status === '已交付') counts.done++; else if (order.status === '修改申请') counts.revisions++; else if (['制作中', '修改中'].includes(order.status)) counts.making++; else counts.pending++; });
  document.querySelector('#new24h').textContent = counts.new24h; document.querySelector('#total').textContent = currentOrders.length; document.querySelector('#pending').textContent = counts.pending; document.querySelector('#revisions').textContent = counts.revisions; document.querySelector('#making').textContent = counts.making; document.querySelector('#done').textContent = counts.done;
  if (!currentOrders.length) { setNotice('暂时没有已同步的订单。新的客户订单会自动显示在这里。'); return; }
  setNotice(`已同步 ${currentOrders.length} 个订单${counts.new24h ? `，过去 24 小时新增 ${counts.new24h} 个` : ''}${counts.revisions ? `，另有 ${counts.revisions} 个修改申请待处理` : ''}。后台每分钟自动刷新。`);
  const template = document.querySelector('#orderTemplate');
  currentOrders.forEach(order => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.order-card');
    card.dataset.id = order.id;
    card.classList.toggle('is-new', isNewOrder(order));
    node.querySelector('.service').textContent = order.service;
    const status = node.querySelector('.status'); status.textContent = order.status; status.classList.add(statusClass(order.status));
    const turnaround = node.querySelector('.turnaround');
    const sla = node.querySelector('.order-sla');
    if (order.turnaround === 'rush-request') {
      turnaround.textContent = '加急待确认'; turnaround.classList.add('is-rush');
      sla.textContent = '客户正在等待你确认能否接单、具体时间和包含加急费用的最终总价。'; sla.classList.add('is-rush');
    } else if (order.turnaround === 'rush-approved') {
      turnaround.textContent = '加急已报价'; turnaround.classList.add('is-approved');
      sla.textContent = `加急申请已确认，最终总价 ${order.price}，当前等待客户付款${order.rushQuoteEmailSent === false ? '；报价邮件发送延迟' : ''}。`;
      sla.classList.toggle('is-rush', order.rushQuoteEmailSent === false);
    } else {
      turnaround.textContent = '常规 24h 首版';
      sla.textContent = '需求、素材与付款确认后，通常 24 小时内完成首版；复杂项目另行确认。';
    }
    const notificationState = node.querySelector('.notification-state');
    if (typeof order.ownerEmailSent !== 'boolean' && typeof order.customerEmailSent !== 'boolean') notificationState.textContent = '邮件状态：旧订单未记录';
    else {
      notificationState.textContent = `邮件状态：工作室提醒${order.ownerEmailSent ? '已发送' : '延迟'}${typeof order.customerEmailSent === 'boolean' ? ` · 客户确认${order.customerEmailSent ? '已发送' : '延迟'}` : ''}`;
      notificationState.classList.toggle('is-delayed', order.ownerEmailSent === false || order.customerEmailSent === false);
    }
    node.querySelector('.idea').textContent = order.idea;
    node.querySelector('.meta').textContent = `${order.email} · ${order.payment} · ${order.price} · ${order.size} · ${order.style}`;
    const references = Array.isArray(order.referenceFiles) ? order.referenceFiles : [];
    const referenceLine = node.querySelector('.references');
    if (references.length) { referenceLine.hidden = false; referenceLine.innerHTML = `<strong>参考样板（私有存储）</strong>${references.map((file, index) => `<button class="reference-download" type="button" data-reference-index="${index}"><span>${escapeHtml(file.path || file.name)}</span><small>${formatBytes(file.size)} · 下载</small></button>`).join('')}`; referenceLine.querySelectorAll('[data-reference-index]').forEach(button => button.addEventListener('click', () => downloadReference(order, Number(button.dataset.referenceIndex)))); }
    node.querySelector('.date').textContent = `订单号 ${order.id} · ${order.date}`;
    const revisions = Array.isArray(order.revisions) ? [...order.revisions].reverse() : [];
    const revisionList = node.querySelector('.revision-list');
    if (revisions.length) revisionList.innerHTML = `<h3>修改记录</h3>${revisions.map(item => `<article class="revision-card"><div><strong>第 ${item.round} 轮 · ${escapeHtml(item.type)}</strong><span>${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.details)}</p>${item.referenceUrl ? `<a href="${escapeHtml(item.referenceUrl)}" target="_blank" rel="noopener">查看参考链接</a>` : ''}${item.referenceName ? `<small>参考文件：${escapeHtml(item.referenceName)}（已随申请邮件发送）</small>` : ''}</article>`).join('')}`;
    const select = node.querySelector('.status-select'); select.value = order.status; select.disabled = order.status === '已交付'; select.addEventListener('change', event => updateOrder(order, event.target.value));
    const rushApproval = node.querySelector('.rush-approval');
    if (order.turnaround === 'rush-request') {
      rushApproval.hidden = false;
      rushApproval.querySelector('.approve-rush').addEventListener('click', () => approveRush(order, rushApproval));
    }
    if (revisions.length) node.querySelector('.delivery-label-text').textContent = '上传修改稿并邮件交付';
    node.querySelector('.file-input').addEventListener('change', event => deliver(order, event.target.files[0])); list.appendChild(node);
  });
}
function escapeHtml(value = '') { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>'); }
async function loadOrders() { try { setNotice('正在加载订单…'); const data = await api('/api/orders'); currentOrders = data.orders || []; renderOrders(); } catch (error) { setNotice(error.setup ? '后台已建好：请先在 Vercel 设置管理员账号、密码与订单存储后启用。' : `无法读取订单：${error.message}`); } }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN'); }
function renderRecharges() {
  const list = document.querySelector('#recharges');
  const rechargeNotice = document.querySelector('#rechargeNotice');
  list.innerHTML = '';
  if (!currentRecharges.length) { rechargeNotice.textContent = '暂时没有充值申请。'; return; }
  const pending = currentRecharges.filter(item => item.status !== '已到账').length;
  rechargeNotice.textContent = `已加载 ${currentRecharges.length} 条充值记录${pending ? `，其中 ${pending} 条待核对` : ''}。`;
  currentRecharges.forEach(item => {
    const card = document.createElement('article');
    card.className = 'recharge-admin-card';
    const approved = item.status === '已到账';
    card.innerHTML = `<div class="recharge-admin-copy"><div class="row"><strong>${escapeHtml(item.id)}</strong><span class="status ${approved ? 'is-done' : 'is-pending'}">${escapeHtml(item.status)}</span></div><h3>实付 ¥${Number(item.amount) || 0} · 赠送 ¥${Number(item.bonusAmount) || 0} · 入账 ¥${Number(item.creditedAmount) || 0}</h3><p>${escapeHtml(item.email)} · ${escapeHtml(item.payment)}</p><small>提交：${escapeHtml(formatDate(item.requestedAt))}${item.approvedAt ? ` · 到账：${escapeHtml(formatDate(item.approvedAt))}` : ''}</small></div><button type="button" class="approve-recharge" ${approved ? 'disabled' : ''}>${approved ? `已到账 · 余额 ¥${Number(item.balanceAfter) || 0}` : '确认实际到账并入账'}</button>`;
    const button = card.querySelector('.approve-recharge');
    if (!approved) button.addEventListener('click', () => approveRecharge(item, button));
    list.appendChild(card);
  });
}
async function loadRecharges() {
  const rechargeNotice = document.querySelector('#rechargeNotice');
  try { rechargeNotice.textContent = '正在加载充值申请…'; const data = await api('/api/recharges'); currentRecharges = data.recharges || []; renderRecharges(); }
  catch (error) { rechargeNotice.textContent = error.setup ? '充值存储尚未配置。' : `无法读取充值申请：${error.message}`; }
}
function countryName(code) {
  if (code === 'ZZ') return '未知国家';
  try { return new Intl.DisplayNames(['zh-CN'], { type: 'region' }).of(code) || code; } catch { return code; }
}
function countryFlag(code) {
  if (!/^[A-Z]{2}$/.test(code) || code === 'ZZ') return '◌';
  return String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0)));
}
function renderAnalytics() {
  const data = currentAnalytics || { totals: {}, today: {}, countries: [] };
  document.querySelector('#analyticsVisitors').textContent = Number(data.totals?.visitors) || 0;
  document.querySelector('#analyticsViews').textContent = Number(data.totals?.views) || 0;
  document.querySelector('#analyticsTodayVisitors').textContent = Number(data.today?.visitors) || 0;
  document.querySelector('#analyticsTodayViews').textContent = Number(data.today?.views) || 0;
  document.querySelector('#analyticsTodayDate').textContent = data.today?.date ? `${data.today.date} · 多伦多时间` : '多伦多时间';
  document.querySelector('#analyticsUpdated').textContent = data.updatedAt ? `最近记录 ${formatDate(data.updatedAt)}` : '等待第一条真实访问';
  const body = document.querySelector('#analyticsCountries');
  const countries = Array.isArray(data.countries) ? data.countries : [];
  const totalVisitors = Number(data.totals?.visitors) || 0;
  if (!countries.length) {
    body.innerHTML = '<tr><td colspan="5" class="analytics-empty">功能上线后还没有记录到真实访客；不会使用演示数字填充。</td></tr>';
    return;
  }
  body.innerHTML = countries.map(item => {
    const shareValue = totalVisitors ? (Number(item.visitors) || 0) / totalVisitors * 100 : 0;
    const share = `${shareValue.toFixed(1)}%`;
    return `<tr><td><span class="country-name"><i>${countryFlag(item.code)}</i><strong>${escapeHtml(countryName(item.code))}</strong><small>${escapeHtml(item.code)}</small></span></td><td>${Number(item.visitors) || 0}</td><td>${Number(item.views) || 0}</td><td><span class="country-share"><i style="--share:${Math.min(100, shareValue)}%"></i><b>${share}</b></span></td><td>${escapeHtml(formatDate(item.lastSeen)) || '—'}</td></tr>`;
  }).join('');
}
async function loadAnalytics() {
  try { currentAnalytics = await api('/api/analytics'); renderAnalytics(); }
  catch (error) { document.querySelector('#analyticsCountries').innerHTML = `<tr><td colspan="5" class="analytics-empty">${escapeHtml(error.setup ? '真实统计存储尚未配置。' : `无法读取访问数据：${error.message}`)}</td></tr>`; }
}
async function approveRecharge(item, button) {
  if (!confirm(`请先在 ${item.payment} 中确认已收到 ¥${item.amount}。\n\n确认后，客户储值卡将增加 ¥${item.creditedAmount}，其中赠送 ¥${Number(item.bonusAmount) || 0}。`)) return;
  button.disabled = true; button.textContent = '正在入账…';
  try {
    const result = await api('/api/recharges', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, action: 'approve' }) });
    await loadRecharges();
    document.querySelector('#rechargeNotice').textContent = `已确认 ${item.id}，客户当前余额为 ¥${Number(result.balance) || 0}${result.emailSent ? '，通知邮件已发送。' : '；余额已入账，通知邮件暂时未发送。'}`;
  } catch (error) { button.disabled = false; button.textContent = '确认实际到账并入账'; document.querySelector('#rechargeNotice').textContent = `入账失败：${error.message}`; }
}
async function loadDashboard(silent = false) { if (!silent) setNotice('正在同步后台数据…'); await Promise.all([loadOrders(), loadRecharges(), loadAnalytics()]); }
async function approveRush(order, container) {
  const input = container.querySelector('.rush-final-amount');
  const button = container.querySelector('.approve-rush');
  const finalAmount = Number(input.value);
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) { setNotice('请填写确认后的加急最终总价。'); input.focus(); return; }
  if (!confirm(`确认可以接下这笔加急订单，并把最终总价设为 ¥${finalAmount} 吗？\n\n确认后客户会收到邮件，订单才会开放付款。`)) return;
  button.disabled = true; button.textContent = '正在确认…';
  try {
    const result = await api(`/api/orders?id=${encodeURIComponent(order.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve-rush', finalAmount }) });
    try {
      await api('/api/notify-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: order.email, orderId: order.id, service: order.service, price: result.order.price, status: '待确认支付' }) });
      setNotice(`已确认 ${order.id} 的加急报价并邮件通知客户。`);
    } catch (emailError) {
      setNotice(`加急报价已保存，但客户邮件暂时发送失败：${emailError.message}`);
    }
    await loadOrders();
  } catch (error) { setNotice(`加急确认失败：${error.message}`); button.disabled = false; button.textContent = '确认报价并邮件通知'; }
}
async function updateOrder(order, status) { if (status === '已交付') { alert('请先上传成品，系统会自动邮件交付并标记为已交付。'); return; } try { if (order.status !== status && ['审核中', '制作中', '修改中'].includes(status)) await api('/api/notify-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: order.email, orderId: order.id, service: order.service, price: order.price, status }) }); await api(`/api/orders?id=${encodeURIComponent(order.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); await loadOrders(); setNotice(['制作中', '修改中'].includes(status) ? `已更新为${status}，并已向客户发送进度邮件。` : '订单状态已更新。'); } catch (error) { alert(`更新失败：${error.message}`); await loadOrders(); } }
async function deliver(order, file) { if (!file) return; if (file.size > 3 * 1024 * 1024) { setNotice('该文件超过 3 MB，邮件附件无法稳定交付。请先压缩文件；大型视频建议使用云端链接交付。'); return; } const reader = new FileReader(); reader.onload = async () => { try { setNotice('正在发送成品邮件…'); await api('/api/notify-delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: order.email, orderId: order.id, service: order.service, price: order.price, fileName: file.name, fileData: reader.result }) }); await api(`/api/orders?id=${encodeURIComponent(order.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: '已交付' }) }); await loadOrders(); setNotice('成品已发送到客户邮箱，并标记为已交付。'); } catch (error) { setNotice(`交付失败：${error.message}`); } }; reader.readAsDataURL(file); }
document.querySelector('#loginForm').addEventListener('submit', async event => { event.preventDefault(); const hint = document.querySelector('#loginHint'); try { await api('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.querySelector('#username').value.trim(), password: document.querySelector('#password').value }) }); setView(true); startDashboardRefresh(); loadDashboard(); } catch (error) { hint.textContent = error.setup ? '管理员账号与密码尚未配置。' : '管理员账号或密码不正确。'; } });
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/admin-auth', { method: 'DELETE', credentials: 'same-origin' }); setView(false); });
document.querySelector('#refresh').addEventListener('click', loadDashboard);
(async () => { try { const session = await api('/api/admin-auth'); if (session.authenticated) { setView(true); startDashboardRefresh(); loadDashboard(); } } catch { /* keep login screen */ } })();
