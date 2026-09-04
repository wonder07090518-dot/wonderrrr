const params = new URLSearchParams(location.search);
const status = document.querySelector('#status');
const createButton = document.querySelector('#create');
const cleanupButton = document.querySelector('#cleanup');
const existingOrderId = params.get('id');

if (existingOrderId) {
  createButton.hidden = true;
  cleanupButton.hidden = false;
  status.textContent = `测试订单 ${existingOrderId} 可以清理`;
}

createButton.addEventListener('click', async () => {
  createButton.disabled = true;
  status.textContent = '正在创建隔离测试订单…';
  try {
    const response = await fetch('/api/payment-confirm?action=test-create', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.orderId) throw new Error(body.error || '测试订单创建失败');
    location.href = `/payment.html?id=${encodeURIComponent(body.orderId)}`;
  } catch (error) {
    status.textContent = error.message || '测试订单创建失败';
    createButton.disabled = false;
  }
});

cleanupButton.addEventListener('click', async () => {
  cleanupButton.disabled = true;
  status.textContent = '正在清理测试订单…';
  try {
    const response = await fetch('/api/payment-confirm?action=test-cleanup', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: existingOrderId })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || '清理失败');
    status.textContent = '测试订单已清理，不会出现在真实客户订单中';
    cleanupButton.hidden = true;
  } catch (error) {
    status.textContent = error.message || '清理失败';
    cleanupButton.disabled = false;
  }
});
