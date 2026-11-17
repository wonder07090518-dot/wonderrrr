import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const apps = ['wordisland','suishuiji','civic-snapshot','framemap','hoursproof','roadkind'];
const marketing = ['index.html','amazon-listing-images.html','etsy-listing-images.html','shopify-product-images.html','faq.html'];
test('Wonder Lab homepage has fixed packages, samples and an accessible inquiry form', async () => {
 const html = await read('index.html');
 assert.match(html, /<title>[^<]*Wonder Lab<\/title>/);
 assert.match(html, /class="brand"[^>]*>Wonder Lab/);
 assert.doesNotMatch(html, /Wonder Ad Lab|Wonderland/);
 for (const price of ['US$19','US$59','US$129']) assert.ok(html.includes(price));
 assert.match(html, /SAMPLE \/ Example — not a client project/);
 assert.match(html, /cropped, muted study/);
 assert.match(html, /<form[^>]*action="\/api\/inquiry"[^>]*method="post"/);
 for (const field of ['email','name','platform','package','product','notes','photoLink','website','acknowledged']) assert.ok(html.includes(`name="${field}"`));
 assert.match(html, /<noscript>/);
 assert.match(html, /wonder-lab\.css/);
 assert.doesNotMatch(html, /script\.min\.js|site\.min\.css|<video/);
});
test('public pages have distinct metadata, structured data and sitemap entries', async () => {
 const sitemap = await read('sitemap.xml'); const titles = new Set();
 for (const file of [...marketing,'privacy.html']) {
  const html = await read(file);const path = file === 'index.html' ? '' : file;
  assert.ok(html.includes(`<link rel="canonical" href="https://www.wonderadlab.com/${path}">`));
  assert.match(html, /name="robots" content="index,follow,max-image-preview:large"/);
  assert.match(html, /name="description" content="[^"]+"/);
  assert.match(html, /og:locale" content="en_US"/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /wonder-lab-social\.jpg/);
  assert.doesNotMatch(html, /Wonder Ad Lab|wonder-ad-lab-social/);
  titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
  for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) {
   const graph = JSON.parse(match[1])['@graph'];
   for (const item of graph.filter(x=>['Organization','WebSite'].includes(x['@type']))) assert.equal(item.name,'Wonder Lab');
  }
  assert.ok(sitemap.includes(`<loc>https://www.wonderadlab.com/${path}</loc>`));
 }
 assert.equal(titles.size,6);
 assert.doesNotMatch(sitemap, /payment|admin|stripe-test|services\/|api\//);
 assert.equal((sitemap.match(/2026-11-16/g)||[]).length,18);
 assert.equal(JSON.parse(await read('site.webmanifest')).name,'Wonder Lab');
 assert.equal(JSON.parse(await read('site.webmanifest')).short_name,'Wonder Lab');
});
test('marketing and old payment page expose no checkout or collection codes', async () => {
 for (const file of marketing) {
  const html = await read(file);
  assert.doesNotMatch(html, /Stripe|stripe|支付宝|微信收款|alipay|wechat.*qr|¥\s*\d|payment\.html|membership/i);
 }
 const payment = await read('payment.html');
 assert.match(payment, /noindex/);
 assert.doesNotMatch(payment, /<script|<form|stripe|qr|checkout|payment\.js/i);
 assert.match(payment, /href="\/#inquire"/);
 assert.match(await read('stripe-test.html'), /noindex/);
});
test('every old service redirects permanently and apps remain publicly available', async () => {
 const config = JSON.parse(await read('vercel.json'));
 for (const file of await readdir(new URL('../services',import.meta.url))) {
  if (!file.endsWith('.html')) continue;
  const redirect = config.redirects.find(x=>x.source === `/services/${file}`);
  assert.equal(redirect?.statusCode,308);
  assert.ok(['/', '/shopify-product-images.html','/amazon-listing-images.html','/etsy-listing-images.html'].includes(redirect.destination));
 }
 assert.ok(config.rewrites.some(x=>x.source==='/api/inquiry' && x.destination.includes('route=inquiry')));
 const sitemap = await read('sitemap.xml');
 for (const app of apps) for (const type of ['support','privacy']) {
  const file = `${app}-${type}.html`; await access(new URL(`../${file}`,import.meta.url));
  assert.ok(sitemap.includes(`/${file}</loc>`)); assert.doesNotMatch(await read(file), /Wonder Ad Lab/);
 }
});
test('admin can see and process revision history', async () => {
  const [html, script, css, delivery] = await Promise.all([read('admin.html'), read('admin.js'), read('admin-revisions.css'), read('api/notify-delivery.js')]);
  assert.match(html, /id="revisions"/);
  assert.match(html, /<option>修改申请<\/option><option>修改中<\/option>/);
  assert.match(html, /class="revision-list"/);
  assert.match(script, /counts\.revisions/);
  assert.match(script, /上传修改稿并邮件交付/);
  assert.match(script, /\['审核中', '制作中', '修改中'\]/);
  assert.match(delivery, /Wonder approval is required before delivery/);
  assert.match(delivery, /Test orders cannot be delivered/);
  assert.match(delivery, /Payment must be verified before delivery/);
  assert.match(delivery, /deliveryApprovedAt/);
  assert.match(delivery, /deliveryEmailSentAt/);
  assert.match(delivery, /Idempotency-Key/);
  assert.match(css, /\.revision-card/);
});

test('serverless API routes stay within the Vercel Hobby deployment limit', async () => {
  const { readdir } = await import('node:fs/promises');
  const apiFiles = (await readdir(new URL('../api', import.meta.url))).filter(name => name.endsWith('.js') && !name.startsWith('_'));
  assert.ok(apiFiles.length <= 12, `expected no more than 12 serverless functions, found ${apiFiles.length}`);
  assert.ok(apiFiles.includes('account-actions.js'));
});
