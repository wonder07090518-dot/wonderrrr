# Wonder Lab guides — 2026-11-17

Added six English pages: `/guides/` (canonical directory), Amazon main image requirements, Etsy listing photo sizes, Etsy shop banner sizes, Shopify product image sizes, and preparing product photos. Each reuses the marketing header, bilingual footer, stylesheet, social image and structured metadata. Added one Guides navigation link to each marketing page and relevant guide links to all three service landings. Updated the sitemap with six new canonical URLs and November 17 dates for new and interlinked pages.

FAQ spacing is now 56px margin plus 8px padding. Headless Chromium layout checks at 320, 390, 800 and 1440px measured a 64px gap between the last FAQ divider and inquiry button. FAQ and all six guide pages had no horizontal overflow. Checks used local HTML with external scripts removed and the actual shared stylesheet.

## Official sources

- Amazon Product image requirements (G1881): https://sellercentral.amazon.com/help/hub/reference/external/G1881
  The live page returned a JavaScript/sign-in shell. Copy follows the user-supplied official US excerpt and explicitly directs readers to current category and marketplace guidance; approval and sales are not guaranteed.
- Etsy image requirements and best practices: https://help.etsy.com/hc/en-us/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop
- Etsy listing image authenticity: https://help.etsy.com/hc/en-us/articles/44297885802647-How-Do-Etsy-s-Listing-Image-Requirements-Apply-to-My-Listings
- Etsy listing creation: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing
- Shopify Product media types: https://help.shopify.com/en/manual/products/product-media/product-media-types
- Shopify Adding product media: https://help.shopify.com/en/manual/products/product-media/add-media
- Shopify general Files uploads: https://help.shopify.com/en/manual/shopify-admin/productivity-tools/file-uploads

Live Etsy image/authenticity help and Shopify Product media types were checked on November 17; supplementary facts follow the official excerpts supplied in the brief. Sources are linked in the relevant guides. Studio preparation recommendations are labeled as guidance. Product/collection limits are separated from general Shopify uploads.

## Validation and boundaries

- `npm test`: 57 passed, 0 failed (all existing 54 plus three added smoke tests).
- `git diff --check`: passed.
- Smoke coverage checks guide metadata, schema, branding, navigation, canonical sitemap entries, permitted dates, payment-code exclusions, key platform distinctions and FAQ spacing.
- No `npm run build`, push or deploy. No DNS, pricing, payment/admin/API changes or spending. No checkout URLs added to the sitemap. No testimonials, performance claims or approval promises added.
