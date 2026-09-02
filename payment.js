const params = new URLSearchParams(location.search);
const key = 'wonderad-payment';
const ordersKey = 'wonderad-orders';
const language = localStorage.getItem('wonderad-language') === 'zh' ? 'zh' : 'en';
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
  submitting: 'Submitting confirmation…',
  failed: 'Payment confirmation could not be submitted. Please stay on this page and try again.',
  qrFailed: 'The payment QR code could not be loaded. Please return to My Orders and try again.',
  topUp: 'Wonder value card top-up',
  topUpNotice: 'After you confirm, the top-up will wait for studio verification. The paid amount and bonus are added only after the funds received are confirmed.',
  topUpSuccess: 'Your value-card top-up confirmation has been submitted. The paid amount and bonus will be credited after Wonder Ad Lab verifies the payment received.',
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
  submitting: '正在提交付款确认…',
  failed: '付款确认暂时无法提交，请留在此页面并重试。',
  qrFailed: '收款码加载失败，请返回“我的订单”后重新打开。',
  topUp: 'Wonder 储值卡充值',
  topUpNotice: '点击确认后，充值会等待工作室核对。只有确认实际到账后，才会把本金和赠送金额一起计入储值卡余额。',
  topUpSuccess: '储值卡充值付款确认已提交。Wonder Ad Lab 核对实际到账后，本金和赠送金额才会入账。',
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
const confirmButton = document.querySelector('#confirmPayment');
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
if (!transactionValid) { description.textContent = copy.invalid; confirmButton.disabled = true; }
else {
  const localizedTitle = transaction.kind === 'membership' && copy.plan[planKey] ? copy.plan[planKey] : (transaction.kind === 'recharge' ? copy.topUp : transaction.title);
  description.textContent = `${localizedTitle} · ${transaction.id}`;
  amount.textContent = `¥${transaction.amount}`;
  if (transaction.kind === 'recharge') {
    const paid = Number(transaction.amount) || 0;
    const bonus = Number(transaction.bonusAmount) || 0;
    const credit = Number(transaction.creditedAmount) || paid + bonus;
    document.querySelector('#paymentNotice').textContent = language === 'en'
      ? `Pay ¥${paid} and receive ¥${credit} in value-card balance, including a ¥${bonus} bonus. ${copy.topUpNotice}`
      : `实付 ¥${paid}，赠送 ¥${bonus}，核验后储值卡到账 ¥${credit}。${copy.topUpNotice}`;
  }
}
function renderMethod() {
  document.querySelectorAll('[data-method]').forEach(button => button.classList.toggle('active', button.dataset.method === method));
  confirmButton.disabled = !transactionValid;
  qr.src = method === '支付宝' ? 'alipay.jpg' : 'wechat.jpg?v=20260901a';
  const visibleMethod = method === '支付宝' ? copy.alipay : copy.wechat;
  qr.alt = copy.qrAlt(visibleMethod);
  hint.textContent = copy.hint(visibleMethod);
}
qr.addEventListener('error', () => { hint.textContent = copy.qrFailed; confirmButton.disabled = true; });
document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => { method = button.dataset.method; renderMethod(); }));
confirmButton.addEventListener('click', async () => {
  if (!transactionValid) return;
  confirmButton.disabled = true;
  const originalLabel = confirmButton.textContent;
  confirmButton.textContent = copy.submitting;
  try {
    if (transaction.kind === 'membership') {
      const memberships = JSON.parse(localStorage.getItem('wonderad-membership-requests') || '[]');
      memberships.unshift({ ...transaction, payment: method, status: copy.status, date: new Date().toLocaleString(language === 'en' ? 'en-CA' : 'zh-CN') });
      localStorage.setItem('wonderad-membership-requests', JSON.stringify(memberships));
    } else if (transaction.kind === 'recharge') {
      const response = await fetch('/api/recharges', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: transaction.id, amount: Number(transaction.amount), payment: method }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || copy.failed);
    } else {
      const response = await fetch('/api/payment-confirm', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: transaction.id, payment: method }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || copy.failed);
      const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
      const order = orders.find(item => item.id === transaction.id);
      if (order) { order.status = copy.status; order.payment = method; localStorage.setItem(ordersKey, JSON.stringify(orders)); }
    }
    localStorage.removeItem(key);
    alert(transaction.kind === 'recharge' ? copy.topUpSuccess : copy.success);
    location.href = 'index.html';
  } catch (error) {
    hint.textContent = language === 'en' ? `${copy.failed} ${error.message}` : `${copy.failed} ${error.message}`;
    confirmButton.disabled = false;
    confirmButton.textContent = originalLabel;
  }
});
renderMethod();
