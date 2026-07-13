const params = new URLSearchParams(location.search);
const key = 'wonderad-payment';
const ordersKey = 'wonderad-orders';
const transaction = JSON.parse(localStorage.getItem(key) || 'null');
const description = document.querySelector('#paymentDescription');
const amount = document.querySelector('#paymentAmount');
const qr = document.querySelector('#paymentQr');
const hint = document.querySelector('#paymentHint');
let method = transaction?.payment === '支付宝' ? '支付宝' : '微信支付';
if (!transaction || params.get('id') !== transaction.id) { description.textContent = '支付订单已失效，请返回网站重新提交。'; document.querySelector('#confirmPayment').disabled = true; }
else { description.textContent = `${transaction.title} · ${transaction.id}`; amount.textContent = `¥${transaction.amount}`; }
function renderMethod() { document.querySelectorAll('[data-method]').forEach(button => button.classList.toggle('active', button.dataset.method === method)); qr.src = method === '支付宝' ? 'alipay.jpg' : 'wechat.jpg'; qr.alt = `${method}收款码`; hint.textContent = `请使用${method}扫码付款`; }
document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => { method = button.dataset.method; renderMethod(); }));
document.querySelector('#confirmPayment').addEventListener('click', () => { if (!transaction) return; if (transaction.kind === 'membership') { const memberships = JSON.parse(localStorage.getItem('wonderad-membership-requests') || '[]'); memberships.unshift({ ...transaction, payment: method, status: '待确认支付', date: new Date().toLocaleString('zh-CN') }); localStorage.setItem('wonderad-membership-requests', JSON.stringify(memberships)); } else { const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]'); const order = orders.find(item => item.id === transaction.id); if (order) { order.status = '待确认支付'; order.payment = method; localStorage.setItem(ordersKey, JSON.stringify(orders)); } } localStorage.removeItem(key); alert('已提交付款确认，请等待 Wonder Ad Lab 团队确认到账。'); location.href = 'index.html'; });
renderMethod();
