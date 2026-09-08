const MANUAL_PAYMENT_METHODS = new Set(['微信支付', '支付宝']);

export function isTestOrder(order) {
  return order?.isTest === true || order?.testCreditUsed === true || order?.fundingSource === 'test';
}

export function orderAmount(order) {
  const match = String(order?.price || '').trim().match(/^¥\s*(\d+(?:\.\d{1,2})?)(?:\s*\/|\s*$)/);
  if (!match) return 0;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function paymentEvidence(order) {
  if (!order || isTestOrder(order)) return null;
  const amount = Number(order.amountPaid) || 0;
  if (order.payment === '安全付款'
      && order.paidAt
      && amount > 0
      && order.stripeCheckoutSessionId
      && order.stripePaymentEventId) return 'stripe-webhook';
  if (order.payment === '余额支付'
      && order.paidAt
      && amount > 0
      && order.fundingSource === 'real') return 'real-balance-debit';
  if (MANUAL_PAYMENT_METHODS.has(order.payment)
      && order.manualPaidAt
      && order.manualPaidBy === 'admin-dashboard') return 'admin-confirmed-manual';
  return null;
}

export function canManuallyConfirmPayment(order) {
  return Boolean(order && !isTestOrder(order) && MANUAL_PAYMENT_METHODS.has(order.payment));
}

export function validateStatusTransition(order, nextStatus) {
  if (!order) return 'Order not found';
  if (order.status === nextStatus) return null;
  if (isTestOrder(order)) return 'Test orders are locked and cannot enter production';
  const evidence = paymentEvidence(order);
  if (nextStatus === '已支付') {
    if (!canManuallyConfirmPayment(order)) return 'Only verified Stripe or real-balance payments can be marked paid automatically';
    if (!['审核中', '待支付', '待确认支付'].includes(order.status)) return 'This order is not awaiting manual payment confirmation';
    return null;
  }
  if (nextStatus === '制作中') {
    if (order.status !== '已支付' || !evidence) return 'Verified payment evidence is required before production can start';
    return null;
  }
  if (nextStatus === '修改中') {
    if (order.status !== '修改申请' || !evidence) return 'A paid order with a pending revision is required';
    return null;
  }
  if (nextStatus === '已交付') {
    if (!evidence || !order.deliveryApprovedAt || !order.deliveryEmailSentAt) return 'A verified payment, Wonder approval record and successful delivery email are required';
    if (!['已支付', '制作中', '修改申请', '修改中'].includes(order.status)) return 'This order is not ready for delivery';
    return null;
  }
  return null;
}
