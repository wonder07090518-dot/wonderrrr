const params = new URLSearchParams(location.search);
const key = 'wonderad-payment';
const ordersKey = 'wonderad-orders';
const language = localStorage.getItem('wonderad-language') === 'zh' ? 'zh' : 'en';
const copy = language === 'en' ? {
  title: 'Wonder Ad Lab · Secure checkout',
  heading: 'Complete payment',
  loading: 'Loading your order…',
  invalid: 'This payment link has expired. Please return to the website and try again.',
  secureTitle: 'Secure payment',
  secureDescription: 'Card and supported wallet payments are completed on Stripe. Wonder Ad Lab never stores your card number.',
  secureButton: 'Continue to secure payment',
  secureMode: 'The first connection uses Stripe test mode and cannot make a real charge.',
  secureStarting: 'Opening Stripe…',
  secureUnavailable: 'Secure payment is still being connected. You can use the manual payment option below for now.',
  manualToggle: 'Need another option? Use manual WeChat Pay or Alipay',
  wechat: 'WeChat Pay',
  alipay: 'Alipay',
  confirm: 'I have completed payment',
  notice: 'Manual payments are marked “Payment pending verification” until Wonder Ad Lab confirms the funds received.',
  hint: methodName => `Scan with ${methodName} to pay`,
  qrAlt: methodName => `${methodName} payment QR code`,
  status: 'Payment pending verification',
  success: 'Your payment confirmation has been submitted. Please wait for Wonder Ad Lab to verify the payment.',
  submitting: 'Submitting confirmation…',
  failed: 'Payment confirmation could not be submitted. Please stay on this page and try again.',
  qrFailed: 'The payment QR code could not be loaded. Please return to My Orders and try again.',
  checking: 'Confirming payment',
  checkingMessage: 'Waiting for Stripe’s signed payment result. Do not close this page.',
  paid: 'Payment confirmed',
  paidTest: 'Test payment confirmed',
  paidMessage: 'Stripe confirmed the payment and your order is now marked as paid.',
  pending: 'Payment is still being confirmed',
  pendingMessage: 'Stripe has not confirmed payment yet. You can safely return and check My Orders again shortly.',
  cancelled: 'Payment was cancelled. No charge was confirmed; you can try again.',
  home: 'Return to Wonder Ad Lab',
  topUp: 'Wonder value card top-up',
  topUpNotice: 'After you confirm, the top-up will wait for studio verification. The paid amount and bonus are added only after the funds received are confirmed.',
  topUpSuccess: 'Your value-card top-up confirmation has been submitted. The paid amount and bonus will be credited after Wonder Ad Lab verifies the payment received.',
  plan: { monthly: 'Monthly membership', yearly: 'Yearly membership' }
} : {
  title: 'Wonder Ad Lab · 安全付款',
  heading: '完成付款',
  loading: '正在载入订单…',
  invalid: '支付订单已失效，请返回网站重新提交。',
  secureTitle: '安全付款',
  secureDescription: '银行卡与可用的钱包方式会在 Stripe 官方付款页完成，Wonder Ad Lab 不会保存你的卡号。',
  secureButton: '前往安全付款',
  secureMode: '首次接入只使用 Stripe 测试模式，不会产生真实扣款。',
  secureStarting: '正在打开 Stripe…',
  secureUnavailable: '安全付款仍在连接中，你现在可以使用下方的人工付款备用方式。',
  manualToggle: '无法使用？改用微信或支付宝人工付款',
  wechat: '微信支付',
  alipay: '支付宝',
  confirm: '我已完成付款',
  notice: '人工付款会先标记为“待确认支付”，工作室核对实际到账后才会改为已支付。',
  hint: methodName => `请使用${methodName}扫码付款`,
  qrAlt: methodName => `${methodName}收款码`,
  status: '待确认支付',
  success: '已提交付款确认，请等待 Wonder Ad Lab 团队确认到账。',
  submitting: '正在提交付款确认…',
  failed: '付款确认暂时无法提交，请留在此页面并重试。',
  qrFailed: '收款码加载失败，请返回“我的订单”后重新打开。',
  checking: '正在确认付款',
  checkingMessage: '正在等待 Stripe 的签名付款结果，请不要关闭页面。',
  paid: '付款已确认',
  paidTest: '测试付款已确认',
  paidMessage: 'Stripe 已确认付款，订单现在已标记为“已支付”。',
  pending: '付款仍在确认中',
  pendingMessage: 'Stripe 暂时还没有确认付款，你可以安全返回网站，稍后在“我的订单”中查看。',
  cancelled: '付款已取消，没有确认任何扣款；你可以重新尝试。',
  home: '返回 Wonder Ad Lab',
  topUp: 'Wonder 储值卡充值',
  topUpNotice: '点击确认后，充值会等待工作室核对。只有确认实际到账后，才会把本金和赠送金额一起计入储值卡余额。',
  topUpSuccess: '储值卡充值付款确认已提交。Wonder Ad Lab 核对实际到账后，本金和赠送金额才会入账。',
  plan: { monthly: '月会员', yearly: '年会员' }
};
const membershipPlans = { monthly: { amount: '29' }, yearly: { amount: '199' } };
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

const orderId = params.get('id') || transaction?.id || '';
const stripeReturn = params.get('stripe');
const description = document.querySelector('#paymentDescription');
const amount = document.querySelector('#paymentAmount');
const secureCheckout = document.querySelector('#secureCheckout');
const secureButton = document.querySelector('#startStripeCheckout');
const secureDescription = document.querySelector('#secureDescription');
const manualToggle = document.querySelector('#manualToggle');
const manualPayment = document.querySelector('#manualPayment');
const paymentResult = document.querySelector('#paymentResult');
const resultSpinner = document.querySelector('.result-spinner');
const resultTitle = document.querySelector('#paymentResultTitle');
const resultMessage = document.querySelector('#paymentResultMessage');
const qr = document.querySelector('#paymentQr');
const hint = document.querySelector('#paymentHint');
const confirmButton = document.querySelector('#confirmPayment');
let method = transaction?.payment === '支付宝' ? '支付宝' : '微信支付';
let transactionValid = Boolean(transaction && (!orderId || orderId === transaction.id));

document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
document.title = copy.title;
document.querySelector('#paymentTitle').textContent = copy.heading;
document.querySelector('#secureTitle').textContent = copy.secureTitle;
secureDescription.textContent = copy.secureDescription;
secureButton.textContent = copy.secureButton;
document.querySelector('#secureMode').textContent = copy.secureMode;
manualToggle.textContent = copy.manualToggle;
document.querySelector('#wechatMethod').textContent = copy.wechat;
document.querySelector('#alipayMethod').textContent = copy.alipay;
confirmButton.textContent = copy.confirm;
document.querySelector('#paymentNotice').textContent = copy.notice;
resultTitle.textContent = copy.checking;
resultMessage.textContent = copy.checkingMessage;
document.querySelector('#paymentResultHome').textContent = copy.home;
description.textContent = copy.loading;

function showManualPayment() {
  manualPayment.hidden = false;
  manualToggle.setAttribute('aria-expanded', 'true');
  renderMethod();
}

async function hydrateOrderFromServer() {
  try {
    const response = await fetch(`/api/payment-confirm?action=status&orderId=${encodeURIComponent(orderId)}`, { credentials: 'same-origin' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || copy.invalid);
    const amountMatch = String(body.price || '').match(/¥\s*(\d+(?:\.\d+)?)/);
    if (!amountMatch) throw new Error(copy.invalid);
    transaction = { id: body.orderId, kind: 'order', title: body.service, amount: amountMatch[1], priceLabel: body.price, payment: body.payment || '安全付款' };
    transactionValid = true;
    localStorage.setItem(key, JSON.stringify(transaction));
    description.textContent = `${body.service} · ${body.orderId}`;
    amount.textContent = body.price;
    secureButton.disabled = false;
    if (['微信支付', '支付宝'].includes(transaction.payment)) {
      secureCheckout.hidden = true;
      manualToggle.hidden = true;
      method = transaction.payment;
      showManualPayment();
    } else {
      secureCheckout.hidden = false;
      manualToggle.hidden = false;
      manualPayment.hidden = true;
    }
  } catch (error) {
    description.textContent = error.message || copy.invalid;
  }
}

if (!transactionValid && stripeReturn !== 'return') {
  description.textContent = copy.invalid;
  secureButton.disabled = true;
  confirmButton.disabled = true;
} else if (transactionValid) {
  const localizedTitle = transaction.kind === 'membership' && copy.plan[planKey]
    ? copy.plan[planKey]
    : (transaction.kind === 'recharge' ? copy.topUp : transaction.title);
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
  if (transaction.kind !== 'order' || ['微信支付', '支付宝'].includes(transaction.payment)) {
    secureCheckout.hidden = true;
    manualToggle.hidden = true;
    showManualPayment();
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

function updateLocalOrderPaid() {
  try {
    const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
    const order = orders.find(item => item.id === orderId);
    if (order) {
      order.status = '已支付';
      order.payment = '安全付款';
      localStorage.setItem(ordersKey, JSON.stringify(orders));
    }
  } catch { /* Shared backend remains the source of truth. */ }
}

async function checkStripeResult() {
  secureCheckout.hidden = true;
  manualToggle.hidden = true;
  manualPayment.hidden = true;
  paymentResult.hidden = false;
  resultTitle.textContent = copy.checking;
  resultMessage.textContent = copy.checkingMessage;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(`/api/payment-confirm?action=status&orderId=${encodeURIComponent(orderId)}`, { credentials: 'same-origin' });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        resultTitle.textContent = copy.pending;
        resultMessage.textContent = language === 'en' ? 'Sign in again, then check My Orders for the official payment status.' : '请重新登录，然后到“我的订单”查看官方付款状态。';
        return;
      }
      if (response.ok) {
        description.textContent = `${body.service} · ${body.orderId}`;
        amount.textContent = body.price || amount.textContent;
        if (body.paid) {
          resultSpinner.hidden = true;
          resultTitle.textContent = body.mode === 'test' ? copy.paidTest : copy.paid;
          resultMessage.textContent = copy.paidMessage;
          localStorage.removeItem(key);
          updateLocalOrderPaid();
          return;
        }
      }
    } catch { /* Retry briefly because the webhook can arrive after the redirect. */ }
    await new Promise(resolve => window.setTimeout(resolve, 1500));
  }
  resultSpinner.hidden = true;
  resultTitle.textContent = copy.pending;
  resultMessage.textContent = copy.pendingMessage;
}

qr.addEventListener('error', () => { hint.textContent = copy.qrFailed; confirmButton.disabled = true; });
document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => { method = button.dataset.method; renderMethod(); }));
manualToggle.addEventListener('click', showManualPayment);

secureButton.addEventListener('click', async () => {
  if (!transactionValid || transaction.kind !== 'order') return;
  secureButton.disabled = true;
  const originalLabel = secureButton.textContent;
  secureButton.textContent = copy.secureStarting;
  try {
    const response = await fetch('/api/payment-confirm?action=create-checkout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: transaction.id })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.url) throw new Error(body.error || copy.secureUnavailable);
    location.assign(body.url);
  } catch (error) {
    secureDescription.textContent = error.message || copy.secureUnavailable;
    secureButton.disabled = false;
    secureButton.textContent = originalLabel;
    showManualPayment();
  }
});

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
    hint.textContent = `${copy.failed} ${error.message}`;
    confirmButton.disabled = false;
    confirmButton.textContent = originalLabel;
  }
});

if (stripeReturn === 'return' && orderId) checkStripeResult();
else if (!transactionValid && orderId) hydrateOrderFromServer();
else {
  if (stripeReturn === 'cancel') secureDescription.textContent = copy.cancelled;
  renderMethod();
}
