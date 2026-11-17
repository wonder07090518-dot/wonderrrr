import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const apps = ['wordisland','suishuiji','civic-snapshot','framemap','hoursproof','roadkind'];
const guides = ['guides/index.html','guides/amazon-main-image-requirements.html','guides/etsy-listing-photo-size.html','guides/etsy-shop-banner-sizes.html','guides/shopify-product-image-sizes.html','guides/prepare-product-photos.html'];
const publicPages = () => [...marketing, 'privacy.html', ...guides];
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
 for (const file of publicPages()) {
  const html = await read(file);const path = file === 'index.html' ? '' : file === 'guides/index.html' ? 'guides/' : file;
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
 assert.equal(titles.size,publicPages().length);
 assert.doesNotMatch(sitemap, /payment|admin|stripe-test|services\/|api\//);
 const entries = [...sitemap.matchAll(/<url>(.*?)<\/url>/gs)].map(match => match[1]);
 assert.equal(entries.length, publicPages().length + apps.length * 2);
 const locations = entries.map(entry => entry.match(/<loc>(.*?)<\/loc>/)[1]);
 assert.equal(new Set(locations).size, entries.length);
 for (const entry of entries) {
  const dates = [...entry.matchAll(/<lastmod>(.*?)<\/lastmod>/g)];
  assert.equal(dates.length, 1);
  assert.ok(['2026-11-16','2026-11-17'].includes(dates[0][1]));
  if (publicPages().some(file => entry.includes(`<loc>https://www.wonderadlab.com/${file === 'index.html' ? '' : file === 'guides/index.html' ? 'guides/' : file}</loc>`))) assert.equal(dates[0][1], '2026-11-17');
 }
 assert.equal(JSON.parse(await read('site.webmanifest')).name,'Wonder Lab');
 assert.equal(JSON.parse(await read('site.webmanifest')).short_name,'Wonder Lab');
});
test('marketing and old payment page expose no checkout or collection codes', async () => {
 for (const file of [...marketing, ...guides]) {
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

test('guides share branding, complete social metadata, schema and accessible navigation', async () => {
 const faq = await read('faq.html');
 const header = faq.match(/<header.*?<\/header>/s)[0];
 const footer = faq.match(/<footer.*?<\/footer>/s)[0];
 for (const file of publicPages()) assert.match(await read(file), /<nav[^>]*>.*?<a href="\/guides\/">Guides<\/a>.*?<\/nav>/s);
 for (const file of guides) {
  const html = await read(file);
  assert.match(html, /<html lang="en">/);
  assert.ok(html.includes(header)); assert.ok(html.includes(footer));
  assert.match(html, /class="skip" href="#main"/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /href="\/wonder-lab.css"/);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const description = html.match(/name="description" content="([^"]+)"/)[1];
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
  for (const prefix of ['og','twitter']) {
   for (const [key,value] of [['title',title],['description',description],['image','https://www.wonderadlab.com/wonder-lab-social.jpg']]) assert.ok(html.includes(`${prefix}:${key}" content="${value}"`));
  }
  assert.ok(html.includes(`og:url" content="${canonical}"`));
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
  for (const type of ['Organization','WebSite','WebPage','BreadcrumbList']) assert.ok(graph.some(item => item['@type'] === type));
  assert.equal(graph.find(item => item['@type'] === 'WebPage').url,canonical);
  assert.match(html, /href="\/#inquire"/);
  assert.doesNotMatch(html, /<form|<iframe|checkout|payment\.js|js\.stripe|buy-button|paypal\.com\/sdk/i);
 }
});
test('guide facts distinguish platform requirements and include official references', async () => {
 const amazon = await read(guides[1]); const etsy = await read(guides[2]);
 const banners = await read(guides[3]); const shopify = await read(guides[4]);
 assert.match(amazon, /G1881/); assert.match(amazon, /at least 85%/);
 for (const size of ['500 px','1000 px','1600 px','10,000 px']) assert.ok(amazon.includes(size));
 assert.match(amazon, /category \/ marketplace style guides take precedence/);
 for (const size of ['2000 px','635 px','1 MB']) assert.ok(etsy.includes(size));
 assert.match(etsy, /115015663347/); assert.match(etsy, /44297885802647/);
 assert.match(etsy, /Most listings need at least one unedited/);
 for (const size of ['1200 × 160','1600 × 213','1200 × 300','1600 × 400','600 × 300','400 × 300','300 × 300','500 × 500','400 × 400','170 × 100','760 × 100']) assert.ok(banners.includes(size));
 assert.match(banners, /require Etsy Plus/);
 for (const phrase of ['5000 × 5000','25 megapixels','smaller than 20 MB','2048 × 2048','20-megapixel','does not require a white background']) assert.ok(shopify.includes(phrase));
 for (const html of [amazon,etsy,banners,shopify]) assert.match(html, /do not guarantee approval or sales/);
 for (const [file,guide] of [['amazon-listing-images.html',guides[1]],['etsy-listing-images.html',guides[2]],['shopify-product-images.html',guides[4]]]) assert.ok((await read(file)).includes(`href="/${guide}"`));
});
test('FAQ inquiry has generous spacing and navigation can wrap on phones', async () => {
 const css = await read('wonder-lab.css');
 assert.match(css, /\.text-hero \.faq\+p\{margin-top:56px;padding-top:8px\}/);
 assert.match(css, /nav\{flex-wrap:wrap/);
 assert.match(await read('faq.html'), /<\/details><\/div><p><a class="button primary" href="\/#inquire">Send an inquiry/);
});
