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
