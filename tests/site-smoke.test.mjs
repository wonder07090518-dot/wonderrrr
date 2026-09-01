import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('mobile navigation exposes language, account and order controls', async () => {
  const [html, css, script] = await Promise.all([read('index.html'), read('manuscript.css'), read('script.js')]);
  assert.match(html, /id="mobileLanguageToggle"/);
  assert.match(html, /id="mobileOpenAuth"/);
  assert.match(html, /class="mobile-order" data-scroll="#order"/);
  assert.match(css, /\.mobile-nav-actions/);
  assert.match(script, /#languageToggle, #mobileLanguageToggle/);
  assert.match(script, /#openAuth, #mobileOpenAuth/);
});

test('membership plans have direct checkout fallbacks', async () => {
  const [html, script, payment] = await Promise.all([read('index.html'), read('script.js'), read('payment.js')]);
  assert.match(html, /href="payment\.html\?plan=monthly"/);
  assert.match(html, /href="payment\.html\?plan=yearly"/);
  assert.match(script, /window\.location\.assign/);
  assert.match(payment, /const membershipPlans =/);
  assert.match(payment, /monthly: \{ amount: '29' \}/);
  assert.match(payment, /yearly: \{ amount: '199' \}/);
  assert.match(payment, /!params\.get\('id'\)/);
});

test('English mode covers previously untranslated key sections', async () => {
  const [script, payment] = await Promise.all([read('script.js'), read('payment.js')]);
  for (const phrase of [
    "'不只是生成一张图':'More than generating one image'",
    "'为持续创作，准备的更快通道':'A faster lane for ongoing creativity'",
    "'直接加我微信':'Add me on WeChat'",
    "'你的隐私，值得被认真对待':'Your privacy deserves care'"
  ]) assert.ok(script.includes(phrase), `missing translation: ${phrase}`);
  assert.match(payment, /heading: 'Complete payment'/);
  assert.match(payment, /wechat: 'WeChat Pay'/);
  assert.match(payment, /notice: 'After you confirm/);
});

test('closed account modals cannot cover mobile navigation', async () => {
  const [css, script] = await Promise.all([read('manuscript.css'), read('script.js')]);
  assert.match(css, /\.inbox-modal \{[^}]*display: none;[^}]*pointer-events: none;/);
  assert.match(css, /\.inbox-modal\.open \{[^}]*display: block;[^}]*pointer-events: auto;/);
  assert.match(script, /document\.querySelectorAll\('\[data-scroll\]'\)[\s\S]*?closeMobileMenu\(\);[\s\S]*?scrollIntoView/);
});

test('desktop AI HUD stays inside the viewport at common laptop widths', async () => {
  const css = await read('ai-interface.css');
  assert.match(css, /@media \(max-width: 1324px\) \{\s*\.hud-model \{ right: -20px; \}/);
});

test('service matrix background stays inside the viewport', async () => {
  const css = await read('service-matrix.css');
  assert.match(css, /inset: 62px max\(-70px, calc\(\(100vw - var\(--wrap\)\) \/ -2 \+ 4px\)\) 40px;/);
});

test('service prices are synchronized to the new affordable catalog', async () => {
  const [html, script, catalog, notify] = await Promise.all([read('index.html'), read('script.js'), read('api/_catalog.js'), read('api/notify-order.js')]);
  const expected = {
    '社媒封面': '¥16 / 张', '营销海报': '¥19 / 张', '电商商品图': '¥22 / 张',
    'PPT 美化': '¥20 / 页起', 'AI 快速配图': '¥12 / 张', '品牌 Logo': '¥25 / 个起'
  };
  for (const [service, price] of Object.entries(expected)) {
    assert.ok(script.includes(`'${service}': '${price}'`), `client price mismatch: ${service}`);
    assert.ok(catalog.includes(`'${service}': '${price}'`), `server price mismatch: ${service}`);
    assert.ok(html.includes(price.replace('¥', '<small>¥</small>').replace(' / ', '<span>/ ')) || html.includes(price), `visible price missing: ${service}`);
  }
  assert.match(notify, /import \{ servicePrices \} from '\.\/_catalog\.js'/);
  assert.doesNotMatch(notify, /const servicePrices\s*=/);
});

test('delivered orders support persisted revision requests and email notices', async () => {
  const [html, script, css, api, orders] = await Promise.all([read('index.html'), read('script.js'), read('manuscript.css'), read('api/revisions.js'), read('api/orders.js')]);
  assert.match(html, /id="revisionModal"/);
  assert.match(html, /id="revisionForm"/);
  assert.match(html, /id="revisionDetails"[^>]*maxlength="1200"/);
  assert.match(script, /fetch\('\/api\/revisions'/);
  assert.match(script, /order\.status === '已交付'/);
  assert.match(script, /data-revision-order/);
  assert.match(css, /\.revision-form/);
  assert.match(css, /\.status\.revision/);
  assert.match(api, /getCurrentUser/);
  assert.match(api, /wonder:revisions/);
  assert.match(api, /Wonder Ad Lab 修改申请/);
  assert.match(api, /reply_to: order\.email/);
  assert.match(orders, /'修改申请', '修改中'/);
});

test('admin can see and process revision history', async () => {
  const [html, script, css] = await Promise.all([read('admin.html'), read('admin.js'), read('admin-revisions.css')]);
  assert.match(html, /id="revisions"/);
  assert.match(html, /<option>修改申请<\/option><option>修改中<\/option>/);
  assert.match(html, /class="revision-list"/);
  assert.match(script, /counts\.revisions/);
  assert.match(script, /上传修改稿并邮件交付/);
  assert.match(script, /\['审核中', '制作中', '修改中'\]/);
  assert.match(css, /\.revision-card/);
});

test('ordinary orders can open the payment QR and confirm to the shared backend', async () => {
  const [html, script, paymentHtml, paymentScript, api] = await Promise.all([read('index.html'), read('script.js'), read('payment.html'), read('payment.js'), read('api/payment-confirm.js')]);
  assert.match(html, /id="openOrderPayment"/);
  assert.match(html, /查看微信收款码并付款/);
  assert.match(script, /function startOrderPayment/);
  assert.match(script, /data-pay-order/);
  assert.match(script, /kind: 'order'/);
  assert.match(paymentHtml, /id="paymentQr"/);
  assert.doesNotMatch(paymentHtml, /class="qr-logo"/);
  assert.match(paymentScript, /fetch\('\/api\/payment-confirm'/);
  assert.match(paymentScript, /credentials: 'same-origin'/);
  assert.match(api, /getCurrentUser/);
  assert.match(api, /status: '待确认支付'/);
  assert.match(api, /客户已确认付款/);
  assert.match(api, /请核对实际到账后再将订单改为“已支付”/);
});
