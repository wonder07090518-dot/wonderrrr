const form = document.querySelector('#inquiry-form');
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#inquiry-status');
  button.disabled = true;
  status.textContent = 'Sending your inquiry…';
  try {
    const response = await fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))), signal: AbortSignal.timeout(40000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'We could not send your inquiry. Please email the studio.');
    status.textContent = data.confirmationSent === false ? `Inquiry ${data.id} received. Your confirmation email could not be sent; keep this reference and email the studio if needed. Do not pay now.` : `Inquiry ${data.id} received. Please check your inbox (and spam folder). Do not pay now. We will reply before sending a PayPal invoice.`;
    form.reset();
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' || error.name === 'TypeError' ? 'We could not confirm delivery. Please check your inbox or email wonder07090518@gmail.com before resubmitting. Do not pay now.' : error.message;
  } finally { button.disabled = false; }
});
