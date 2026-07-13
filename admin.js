const loginView = document.querySelector('#loginView');
const dashboard = document.querySelector('#dashboard');
const notice = document.querySelector('#notice');
let currentOrders = [];

function statusClass(status) { return status === '已交付' ? 'is-done' : status === '制作中' ? 'is-making' : ''; }
function setView(loggedIn) { loginView.hidden = loggedIn; dashboard.hidden = !loggedIn; document.querySelector('#logout').hidden = !loggedIn; }
function setNotice(message) { notice.textContent = message; }
async function api(path, options = {}) { const response = await fetch(path, { credentials: 'same-origin', ...options }); const body = await response.json().catch(() => ({})); if (!response.ok) throw Object.assign(new Error(body.error || '请求失败'), { code: response.status, setup: body.setup }); return body; }
function renderOrders() {
  const list = document.querySelector('#orders'); list.innerHTML = '';
  const counts = { pending: 0, making: 0, done: 0 };
  currentOrders.forEach(order => { if (order.status === '已交付') counts.done++; else if (order.status === '制作中') counts.making++; else counts.pending++; });
  document.querySelector('#total').textContent = currentOrders.length; document.querySelector('#pending').textContent = counts.pending; document.querySelector('#making').textContent = counts.making; document.querySelector('#done').textContent = counts.done;
  if (!currentOrders.length) { setNotice('暂时没有已同步的订单。新的客户订单会自动显示在这里。'); return; }
  setNotice(`已加载 ${currentOrders.length} 个订单。`);
  const template = document.querySelector('#orderTemplate');
  currentOrders.forEach(order => { const node = template.content.cloneNode(true); const card = node.querySelector('.order-card'); card.dataset.id = order.id; node.querySelector('.service').textContent = order.service; const status = node.querySelector('.status'); status.textContent = order.status; status.classList.add(statusClass(order.status)); node.querySelector('.idea').textContent = order.idea; node.querySelector('.meta').textContent = `${order.email} · ${order.payment} · ${order.price} · ${order.size} · ${order.style}`; node.querySelector('.date').textContent = `订单号 ${order.id} · ${order.date}`; node.querySelector('.status-select').value = order.status === '已交付' ? '制作中' : order.status; node.querySelector('.status-select').addEventListener('change', event => updateOrder(order.id, { status: event.target.value })); node.querySelector('.file-input').addEventListener('change', event => deliver(order, event.target.files[0])); list.appendChild(node); });
}
async function loadOrders() { try { setNotice('正在加载订单…'); const data = await api('/api/orders'); currentOrders = data.orders || []; renderOrders(); } catch (error) { setNotice(error.setup ? '后台已建好：请先在 Vercel 设置管理员账号、密码与订单存储后启用。' : `无法读取订单：${error.message}`); } }
async function updateOrder(id, update) { try { await api(`/api/orders?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) }); await loadOrders(); } catch (error) { alert(`更新失败：${error.message}`); } }
async function deliver(order, file) { if (!file) return; const reader = new FileReader(); reader.onload = async () => { try { setNotice('正在发送成品邮件…'); await api('/api/notify-delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: order.email, orderId: order.id, service: order.service, price: order.price, fileName: file.name, fileData: reader.result }) }); await updateOrder(order.id, { status: '已交付' }); setNotice('成品已发送到客户邮箱，并标记为已交付。'); } catch (error) { setNotice(`交付失败：${error.message}`); } }; reader.readAsDataURL(file); }
document.querySelector('#loginForm').addEventListener('submit', async event => { event.preventDefault(); const hint = document.querySelector('#loginHint'); try { await api('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.querySelector('#email').value.trim(), password: document.querySelector('#password').value }) }); setView(true); loadOrders(); } catch (error) { hint.textContent = error.setup ? '管理员账号与密码尚未配置。等你提供后即可启用。' : '邮箱或密码不正确。'; } });
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/admin-auth', { method: 'DELETE', credentials: 'same-origin' }); setView(false); });
document.querySelector('#refresh').addEventListener('click', loadOrders);
(async () => { try { const session = await api('/api/admin-auth'); if (session.authenticated) { setView(true); loadOrders(); } } catch { /* keep login screen */ } })();
