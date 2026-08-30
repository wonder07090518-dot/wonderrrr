const params = new URLSearchParams(location.search);
const key = 'wonderad-payment';
const ordersKey = 'wonderad-orders';
const language = localStorage.getItem('wonderad-language') === 'en' ? 'en' : 'zh';
const copy = language === 'en' ? {
  title: 'Wonder Ad Lab · Secure checkout',
  heading: 'Complete payment',
  loading: 'Loading your order…',
  invalid: 'This payment link has expired. Please return to the website and try again.',
  wechat: 'WeChat Pay',
  alipay: 'Alipay',
  confirm: 'I have completed payment',
  notice: 'After you confirm, the order will be marked as “Payment pending verification”. Wonder Ad Lab will verify the payment received.',
  hint: methodName => `Scan with ${methodName} to pay`,
  qrAlt: methodName => `${methodName} payment QR code`,
  status: 'Payment pending verification',
  success: 'Your payment confirmation has been submitted. Please wait for Wonder Ad Lab to verify the payment.',
  plan: { monthly: 'Monthly membership', yearly: 'Yearly membership' }
} : {
  title: 'Wonder Ad Lab · 支付订单',
  heading: '完成付款',
  loading: '正在载入订单…',
  invalid: '支付订单已失效，请返回网站重新提交。',
  wechat: '微信支付',
  alipay: '支付宝',
  confirm: '我已完成付款',
  notice: '点击后订单将标记为“待确认支付”。到账确认由 Wonder Ad Lab 团队完成。',
  hint: methodName => `请使用${methodName}扫码付款`,
  qrAlt: methodName => `${methodName}收款码`,
  status: '待确认支付',
  success: '已提交付款确认，请等待 Wonder Ad Lab 团队确认到账。',
  plan: { monthly: '月会员', yearly: '年会员' }
};
const membershipPlans = {
  monthly: { amount: '29' },
  yearly: { amount: '199' }
};
const planKey = params.get('plan');
let transaction;
try { transaction = JSON.parse(localStorage.getItem(key) || 'null'); } catch { transaction = null; }
if (membershipPlans[planKey] && (!params.get('id') || !transaction || params.get('id') !== transaction.id)) {
  transaction = {
    id: params.get('id') || `MB${Date.now().toString().slice(-7)}`,
    kind: 'membership',
    title: copy.plan[planKey],
    amount: membershipPlans[planKey].amount,
    payment: '微信支付'
  };
  localStorage.setItem(key, JSON.stringify(transaction));
}
const description = document.querySelector('#paymentDescription');
const amount = document.querySelector('#paymentAmount');
const qr = document.querySelector('#paymentQr');
const hint = document.querySelector('#paymentHint');
let method = transaction?.payment === '支付宝' ? '支付宝' : '微信支付';
const transactionValid = transaction && (!params.get('id') || params.get('id') === transaction.id);
document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
document.title = copy.title;
document.querySelector('#paymentTitle').textContent = copy.heading;
document.querySelector('#wechatMethod').textContent = copy.wechat;
document.querySelector('#alipayMethod').textContent = copy.alipay;
document.querySelector('#confirmPayment').textContent = copy.confirm;
document.querySelector('#paymentNotice').textContent = copy.notice;
description.textContent = copy.loading;
if (!transactionValid) { description.textContent = copy.invalid; document.querySelector('#confirmPayment').disabled = true; }
else {
  const localizedTitle = transaction.kind === 'membership' && copy.plan[planKey] ? copy.plan[planKey] : transaction.title;
  description.textContent = `${localizedTitle} · ${transaction.id}`;
  amount.textContent = `¥${transaction.amount}`;
}
function renderMethod() {
  document.querySelectorAll('[data-method]').forEach(button => button.classList.toggle('active', button.dataset.method === method));
  qr.src = method === '支付宝' ? 'alipay.jpg' : 'wechat.jpg';
  const visibleMethod = method === '支付宝' ? copy.alipay : copy.wechat;
  qr.alt = copy.qrAlt(visibleMethod);
  hint.textContent = copy.hint(visibleMethod);
}
document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => { method = button.dataset.method; renderMethod(); }));
document.querySelector('#confirmPayment').addEventListener('click', () => { if (!transactionValid) return; if (transaction.kind === 'membership') { const memberships = JSON.parse(localStorage.getItem('wonderad-membership-requests') || '[]'); memberships.unshift({ ...transaction, payment: method, status: copy.status, date: new Date().toLocaleString(language === 'en' ? 'en-CA' : 'zh-CN') }); localStorage.setItem('wonderad-membership-requests', JSON.stringify(memberships)); } else { const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]'); const order = orders.find(item => item.id === transaction.id); if (order) { order.status = copy.status; order.payment = method; localStorage.setItem(ordersKey, JSON.stringify(orders)); } } localStorage.removeItem(key); alert(copy.success); location.href = 'index.html'; });
renderMethod();
