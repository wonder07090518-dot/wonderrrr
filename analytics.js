(() => {
  if (!['wonderadlab.com', 'www.wonderadlab.com'].includes(window.location.hostname)) return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
  fetch('/api/analytics', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    keepalive: true
  }).catch(() => {});
})();
