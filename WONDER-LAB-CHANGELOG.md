# Wonder Lab public-site rebuild — 2026-11-16

- Branch: `rebuild-wonder-lab-2026-11-16`, based on the backed-up production history. No main checkout, rebase, force push, push, DNS changes or deployment.
- Replaced `index.html` completely with an English listing-image studio website. Added `wonder-lab.css` and `inquiry.js`; retained privacy-aware `analytics.js`. No old marketing scripts, hero video, login, membership or public checkout.
- Added `amazon-listing-images.html`, `etsy-listing-images.html`, `shopify-product-images.html`, and `faq.html`; rewrote `privacy.html` for inquiries and PayPal invoicing while explaining existing app services separately.
- Packages: Trial US$19 (1 infographic or 3 white-background images; no revision round), Standard US$59 (1 main + 3 infographic + 1 lifestyle; one revision round), Complete US$129 (7 images + store banner; two rounds). First preview about 48 hours after confirmed payment and complete materials; complex projects agreed separately.
- Existing coffee/skincare/travel artwork is labeled SAMPLE / Example — not a client project. Before views are explicitly described as muted cropped studies of the same artwork, never customer originals. No performance claims.
- Inquiry endpoint: `/api/inquiry` rewrites to `api/account-actions?route=inquiry`, implemented in `api/_inquiry-route.js` to preserve the existing Vercel function count. Other API routes and backend business logic remain intact.
- Studio notifications go to **wonder07090518@gmail.com** in Chinese, with customer `reply_to`. Customer confirmation is English. Both include the inquiry reference and explain inquiry-only status, PayPal invoice (Goods & Services), work after confirmed payment, and no Friends & Family transfers. References use `WL-YYYYMMDD-XXXX`.
- Runtime requires existing `RESEND_API_KEY` and `MAIL_FROM`. Missing configuration returns 503. Validates fields and photo URL, rejects honeypot submissions, requires acknowledgment, and limits each IP to one attempt per five minutes. Resend failures keep the rate-limit reservation; studio delivery failure returns 502. Customer-only delivery failure reports studio receipt with an explicit confirmation-email warning.
- Abuse limiting uses bounded process-local memory, as permitted in the brief. It is per warm instance and resets on a cold start; it is not a shared cross-instance quota. No paid service provisioned.
- Every existing `services/*.html` URL has an explicit 308 redirect, plus a wildcard fallback. E-commerce pages go to Shopify, banner/social pages to Etsy, remaining pages to the homepage. Static service files also carry noindex.
- `payment.html` is an inert noindex explanation linking to inquiry, with no payment scripts/forms/codes. `stripe-test.html` is noindex. Existing backend payment and app APIs are retained.
- Retained all 12 App support/privacy pages; only changed studio signatures from Wonder Ad Lab to Wonder Lab where present. App names and support content preserved.
- Updated canonical URLs, descriptions, OG/Twitter metadata, structured data, sitemap (18 URLs; lastmod 2026-11-16), robots and webmanifest. Created a local-script-generated 1200×630 `wonder-lab-social.jpg`. Existing favicon and Apple touch icon reused.
- Amazon guidance links to official Seller Help and instructs sellers to verify current category/marketplace policies. Platform approval is not guaranteed.

## Validation

- `npm install`: completed. Existing dependency audit reports 7 vulnerabilities (1 moderate, 6 high); no dependency upgrades attempted.
- `npm test`: **54 passed, 0 failed**, including inquiry validation/bot/configuration/mail/rate-limit/failure checks and retained Apple, Stripe, membership, balance and support tests.
- Replaced obsolete public-site smoke assertions with new branding, package, inquiry, metadata, sitemap, redirects, no-checkout and app-page checks; retained admin revision and function-count checks.
- Headless Chrome: homepage, all three landing pages, FAQ and privacy at **390px and 1440px**: no horizontal overflow; no browser JavaScript errors. Mocked browser inquiry submission displays reference and do-not-pay message.
- Screenshots saved locally at `/tmp/wonder-lab-390.png` and `/tmp/wonder-lab-1440.png` (not committed).
- `git diff --check`: passed.
- No `npm run build`, live Resend delivery, Stripe setup command, payment, push or deployment performed.

## Deployment handoff

Deployment is reserved for the owner. Confirm `RESEND_API_KEY` and a verified `MAIL_FROM` in the deployment environment. After deployment, submit one controlled inquiry to check real delivery of both emails and verify legacy redirects. Local email tests used mocks and did not confirm production mailbox delivery.
