import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
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

test('language switching localizes accessible labels and image descriptions', async () => {
  const script = await read('script.js');
  for (const phrase of [
    "'AI creative interface preview', 'AI 创意界面预览'",
    "'Service categories', '服务分类'",
    "'Choose an AI capability', '选择 AI 能力'",
    "'Close revision request', '关闭修改申请'",
    "'Wonder Ad Lab black-metal brand mark', 'Wonder Ad Lab 黑色金属品牌标志'"
  ]) assert.ok(script.includes(phrase), `missing accessible translation: ${phrase}`);
  assert.match(script, /localizedAttributes\.forEach/);
  assert.match(script, /setAttribute\(attribute, language === 'en' \? en : zh\)/);
});

test('new visitors start in English while explicit and saved language choices are preserved', async () => {
  const [html, script] = await Promise.all([read('index.html'), read('script.js')]);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta property="og:locale" content="en_CA"/);
  assert.match(html, /<title>AI Posters, E-commerce &amp; PPT Design \| Wonder Ad Lab<\/title>/);
  assert.match(script, /const requestedLanguage = pageParams\.get\('lang'\)/);
  assert.match(script, /const savedLanguage = localStorage\.getItem\('wonderad-language'\)/);
  assert.match(script, /\['en', 'zh'\]\.includes\(requestedLanguage\)/);
  assert.match(script, /savedLanguage : 'en'/);
});

test('search engines can discover focused service guides and their images', async () => {
  const servicePages = [
    'ai-poster-design.html', 'social-cover-design.html', 'ecommerce-visual-design.html',
    'ppt-design.html', 'logo-design.html', 'banner-design.html',
    'menu-price-list-design.html', 'ai-image-design.html', 'creative-design-services.html'
  ];
  const [home, sitemap, robots] = await Promise.all([read('index.html'), read('sitemap.xml'), read('robots.txt')]);
  assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.match(sitemap, /<image:image>/);
  assert.match(robots, /Sitemap: https:\/\/www\.wonderadlab\.com\/sitemap\.xml/);

  for (const file of servicePages) {
    const route = `/services/${file}`;
    const page = await read(route.slice(1));
    assert.ok(home.includes(`href="${route}"`), `home link missing: ${route}`);
    assert.ok(sitemap.includes(`https://www.wonderadlab.com${route}`), `sitemap URL missing: ${route}`);
    assert.match(page, /<meta name="description" content="[^"]+">/);
    assert.match(page, /<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.ok(page.includes(`<link rel="canonical" href="https://www.wonderadlab.com${route}">`), `canonical missing: ${route}`);
    assert.match(page, /<script type="application\/ld\+json">/);
    assert.match(page, /<h1>/);
  }

  const indexNowKey = (await read('0209f9bb53f5d942677b5c09c5db2c91.txt')).trim();
  assert.equal(indexNowKey, '0209f9bb53f5d942677b5c09c5db2c91');
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

test('orders upload up to 100 reference files and 1 GB directly into private storage', async () => {
  const [html, script, css, notify, orders, uploadApi, uploadClient, admin] = await Promise.all([read('index.html'), read('script.js'), read('manuscript.css'), read('api/notify-order.js'), read('api/orders.js'), read('api/reference-upload.js'), read('reference-upload-client.entry.js'), read('admin.js')]);
  assert.match(html, /id="orderReferenceFiles"[^>]*multiple/);
  assert.match(html, /id="orderReferenceFolder"[^>]*webkitdirectory/);
  assert.match(html, /最多 100 个 · 合计 1GB/);
  assert.match(script, /MAX_ORDER_REFERENCE_FILES = 100/);
  assert.match(script, /MAX_ORDER_REFERENCE_BYTES = 1024 \* 1024 \* 1024/);
  assert.match(script, /uploadOrderReferenceFiles/);
  assert.doesNotMatch(script, /function readOrderReferenceFile/);
  assert.match(css, /\.reference-file-list/);
  assert.match(css, /\.reference-progress/);
  assert.match(uploadClient, /multipart: file\.size > MULTIPART_THRESHOLD/);
  assert.match(uploadClient, /access: 'private'/);
  assert.match(uploadApi, /handleUpload/);
  assert.match(uploadApi, /maximumSizeInBytes: MAX_FILE_BYTES/);
  assert.match(uploadApi, /MAX_ORDER_BYTES = 1024 \* 1024 \* 1024/);
  assert.match(uploadApi, /MAX_ORDER_FILES = 100/);
  assert.match(notify, /已安全存入私有空间/);
  assert.doesNotMatch(notify, /ownerPayload\.attachments = references/);
  assert.match(notify, /Idempotency-Key/);
  assert.match(notify, /getCurrentUser/);
  assert.match(notify, /wonder:order:/);
  assert.match(orders, /referenceMetadata/);
  assert.match(orders, /await head\(item\.blobUrl\)/);
  assert.match(orders, /MAX_REFERENCE_BYTES = 1024 \* 1024 \* 1024/);
  assert.match(orders, /MAX_REFERENCE_FILES = 100/);
  assert.match(orders, /delete order\.referenceAttachments/);
  assert.match(orders, /issueSignedToken/);
  assert.match(orders, /validUntil = Date\.now\(\) \+ 10 \* 60 \* 1000/);
  assert.match(orders, /createReferenceDownload/);
  assert.match(admin, /参考样板（私有存储）/);
  assert.match(admin, /downloadReference/);
});

test('feedback form saves suggestions and emails the studio with abuse controls', async () => {
  const [html, script, css, api, router, vercel] = await Promise.all([read('index.html'), read('script.js'), read('manuscript.css'), read('api/_feedback-route.js'), read('api/account-actions.js'), read('vercel.json')]);
  assert.match(html, /id="openFeedback"/);
  assert.match(html, /id="feedbackModal"/);
  assert.match(html, /id="feedbackForm"/);
  assert.match(html, /id="feedbackMessage"[^>]*maxlength="2000"/);
  assert.match(script, /fetch\('\/api\/feedback'/);
  assert.match(script, /Feedback & suggestions/);
  assert.match(css, /\.feedback-honeypot/);
  assert.match(api, /wonder07090518@gmail\.com/);
  assert.match(api, /wonder:feedback-rate:/);
  assert.match(api, /count <= 5/);
  assert.match(api, /req\.body\?\.website/);
  assert.match(api, /reply_to: email/);
  assert.match(api, /Wonder Ad Lab 意见建议/);
  assert.match(router, /route === 'feedback'/);
  assert.match(vercel, /"source": "\/api\/feedback"/);
});

test('value-card top-ups include a ten-percent bonus only after idempotent admin approval', async () => {
  const [html, script, payment, api, balanceApi, balanceHelpers, adminHtml, adminScript] = await Promise.all([
    read('index.html'), read('script.js'), read('payment.js'), read('api/_recharges-route.js'), read('api/_balance-route.js'), read('api/_balance.js'), read('admin.html'), read('admin.js')
  ]);
  assert.match(html, /id="rechargeModal"/);
  assert.match(html, /支付 ¥100，赠送 ¥10，到账余额 ¥110/);
  assert.match(html, /value="500"/);
  assert.match(html, /核对实际到账/);
  assert.match(script, /kind: 'recharge'/);
  assert.match(script, /accountApi\('\/api\/balance'\)/);
  assert.match(payment, /fetch\('\/api\/recharges'/);
  assert.match(payment, /topUpNotice/);
  assert.match(balanceHelpers, /new Set\(\[100, 200, 300, 400, 500\]\)/);
  assert.match(balanceHelpers, /function rechargeBonus/);
  assert.match(balanceHelpers, /function rechargeCredit/);
  assert.match(api, /bonusAmount = rechargeBonus\(amount\)/);
  assert.match(api, /creditedAmount = rechargeCredit\(amount\)/);
  assert.match(api, /isAdmin\(req\)/);
  assert.match(api, /kv\('setnx', `wonder:recharge-applied:/);
  assert.match(api, /kv\('incrby', balanceKey\(item\.email\), item\.creditedAmount\)/);
  assert.match(balanceApi, /getCurrentUser/);
  assert.match(balanceApi, /bonusAmount: item\.bonusAmount \|\| 0/);
  assert.match(adminHtml, /id="recharges"/);
  assert.match(adminScript, /action: 'approve'/);
  assert.match(adminHtml, /每充 ¥100 赠 ¥10/);
  assert.match(adminScript, /确认实际到账并入账/);
});

test('signed-in customers can pay an order from balance without duplicate deductions', async () => {
  const [html, script, orderApi, route, router, vercel] = await Promise.all([
    read('index.html'), read('script.js'), read('api/orders.js'), read('api/_balance-payment-route.js'), read('api/account-actions.js'), read('vercel.json')
  ]);
  assert.match(script, /value="余额支付"/);
  assert.match(html, /value="微信支付" checked/);
  assert.match(script, /fetch\(path, \{ credentials: 'same-origin'/);
  assert.match(script, /accountApi\('\/api\/balance-payment'/);
  assert.match(script, /data-balance-pay-order/);
  assert.match(script, /Remaining balance/);
  assert.match(html, /id="submittedTitle"/);
  assert.match(orderApi, /'余额支付'/);
  assert.match(route, /servicePrices\[order\.service\]/);
  assert.match(route, /This order does not belong to your account/);
  assert.match(route, /redis\.call\('EXISTS', KEYS\[2\]\)/);
  assert.match(route, /current < amount/);
  assert.match(route, /redis\.call\('DECRBY', KEYS\[1\], amount\)/);
  assert.match(route, /status: '已支付'/);
  assert.match(router, /route === 'balance-payment'/);
  assert.match(vercel, /"source": "\/api\/balance-payment"/);
});

test('serverless API routes stay within the Vercel Hobby deployment limit', async () => {
  const { readdir } = await import('node:fs/promises');
  const apiFiles = (await readdir(new URL('../api', import.meta.url))).filter(name => name.endsWith('.js') && !name.startsWith('_'));
  assert.ok(apiFiles.length <= 12, `expected no more than 12 serverless functions, found ${apiFiles.length}`);
  assert.ok(apiFiles.includes('account-actions.js'));
});

test('website removes unavailable or scripted AI conversations', async () => {
  const [html, script, css] = await Promise.all([read('index.html'), read('script.js'), read('manuscript.css')]);
  assert.doesNotMatch(html, /id="buildPrompt"|id="supportPanel"|id="openSupport"/);
  assert.doesNotMatch(script, /fetch\('\/api\/ai-brief'|function answerSupport|#openSupport/);
  assert.doesNotMatch(css, /\.ai-support|\.prompt-output/);
  assert.match(html, /不用写专业术语，我们收到后会帮你整理清楚/);
  await assert.rejects(() => access(new URL('../api/ai-brief.js', import.meta.url)));
});

test('public indexing focuses on the main service page, not checkout', async () => {
  const [html, script, sitemap, payment, manifest] = await Promise.all([read('index.html'), read('script.js'), read('sitemap.xml'), read('payment.html'), read('site.webmanifest')]);
  assert.match(sitemap, /<loc>https:\/\/www\.wonderadlab\.com\/<\/loc>/);
  assert.match(sitemap, /<lastmod>2026-08-31<\/lastmod>/);
  for (const page of ['ai-poster-design', 'social-cover-design', 'ecommerce-visual-design', 'ppt-design']) {
    assert.match(sitemap, new RegExp(`<loc>https:\\/\\/www\\.wonderadlab\\.com\\/services\\/${page}\\.html<\\/loc>`));
    const servicePage = await read(`services/${page}.html`);
    assert.match(servicePage, /<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.match(servicePage, /<link rel="canonical" href="https:\/\/www\.wonderadlab\.com\/services\//);
    assert.match(servicePage, /application\/ld\+json/);
    assert.match(servicePage, /href="\/\?service=/);
  }
  assert.doesNotMatch(sitemap, /payment\.html/);
  assert.match(payment, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /wonder-ad-lab-social\.jpg/);
  assert.match(html, /hero-wonder-3d-960\.webp/);
  assert.match(html, /service-guide-grid/);
  assert.match(script, /pageParams\.get\('service'\)/);
  assert.doesNotMatch(html, /120\+ 项 AI 创意服务与搜索场景/);
  assert.equal(JSON.parse(manifest).name, 'Wonder Ad Lab 奇迹创意工作室');
});

test('homepage uses optimized visual assets and stable dimensions', async () => {
  const [html, css, siteCss] = await Promise.all([read('index.html'), read('manuscript.css'), read('site.min.css')]);
  assert.match(html, /site\.min\.css\?v=/);
  assert.match(html, /script\.min\.js\?v=/);
  assert.doesNotMatch(html, /href="ai-interface\.css|href="scroll-story\.css|href="service-matrix\.css/);
  assert.match(html, /hero-wonder-3d-960\.webp 960w, hero-wonder-3d-1660\.webp 1660w/);
  assert.match(html, /fetchpriority="high" decoding="async"/);
  assert.match(html, /portfolio-coffee\.webp" width="1122" height="1402"/);
  assert.match(html, /href="wonder-wechat-qr\.png"/);
  assert.match(html, /wonder-wechat-qr\.png" width="888" height="1131"/);
  assert.match(html, /点击二维码查看高清图/);
  assert.match(siteCss, /\.wechat-qr-link/);
  assert.match(css, /background-image: url\("portfolio-coffee\.webp"\)/);
  assert.doesNotMatch(css, /background-image: url\("portfolio-coffee\.jpg"\)/);
});
