# PRD: SEO Optimization — L'Atelier des Cousettes

## Problem

The site `couture-tarn.fr` has solid SEO foundations but is missing several optimizations that limit its visibility in local French search results. Key gaps: no social preview images on any page, no Service/FAQ structured data for the 3 service offerings, fonts loaded from third-party CDN hurting performance, no analytics to measure improvements, thin meta descriptions missing local keywords.

## Intended Outcome

Maximize organic search visibility for local queries like "cours de couture Tarn", "stage couture Revel", "atelier couture Verdalle". Improve social sharing previews on Facebook. Enable measurement via Vercel Analytics.

## User Stories

### As a potential student searching Google
- I search "cours de couture Revel" and find the site in results with a rich snippet showing the business name, price range, and location
- I see FAQ answers directly in search results for common questions about pricing and workshops
- The search result has a compelling meta description mentioning my local area

### As someone sharing the site on Facebook
- When I share any page URL, a large preview image and description appear automatically
- The preview looks professional with the page's cover image

### As the site owner (Isabelle)
- I can see visitor traffic and popular pages via Vercel Analytics
- Google indexes all my service pages with rich results (Service, FAQ schemas)
- My site loads faster because fonts are self-hosted

## Implementation Status

### Phase 1 — Performance & Foundations [DONE]
- [x] Self-host Google Fonts via `@fontsource-variable` (eliminates third-party requests to fonts.gstatic.com, GDPR-compliant)
- [x] Add Vercel Analytics (`@vercel/analytics`)
- [x] Add preconnect hints for YouTube thumbnails (`img.youtube.com`)

### Phase 2 — Social Sharing [DONE]
- [x] OG images for all pages (resolved from cover images, with `/og-default.jpg` fallback)
- [x] Upgrade Twitter Card to `summary_large_image` with `twitter:image`
- [x] Add `meta robots` tags (`index,follow` default; `noindex,follow` for mentions-legales)

### Phase 3 — Structured Data [DONE]
- [x] `<slot name="page-head">` passthrough in ContentPage for per-page schemas
- [x] Service schema on 3 service pages (stages, ateliers, apres-midi) with detailed pricing offers
- [x] FAQ schema with natural Q&A pairs extracted from content (8 total Q&As across 3 pages)
- [x] Enhanced LocalBusiness schema: `founder` (Isabelle Bultez), `openingHoursSpecification`, `hasOfferCatalog`, `image`
- [x] ImageGallery schema on creations page with all gallery items

### Phase 4 — On-Page SEO [DONE]
- [x] Rewritten all 6 seoDescription fields (120-155 chars, local keywords: Tarn, Revel, Verdalle, pricing)
- [x] Added `coverImageAlt` field to Keystatic schema for all page singletons
- [x] Updated Hero component to accept `altText` prop with fallback

### Phase 5 — Polish [DONE]
- [x] Full favicon set from 🧵 emoji: `favicon.ico`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`
- [x] `site.webmanifest` with theme color and app name
- [x] Internal cross-linking between all 4 content pages (stages, ateliers, apres-midi, couturiere)
- [x] `llms.txt` for AI crawler discoverability (ChatGPT, Claude, Perplexity)
- [x] Updated `robots.txt` to explicitly allow AI crawlers (GPTBot, Claude-Web, PerplexityBot, Applebot-Extended)

## Files Modified

| File | Changes |
|------|---------|
| `src/layouts/BaseLayout.astro` | OG image fallback, twitter:image, robots meta, preconnect, analytics, favicon links |
| `src/styles/global.css` | Self-hosted fonts via @fontsource-variable imports |
| `src/components/ContentPage.astro` | OG image resolution, `page-head` slot, `coverImageAlt`/`noIndex` props |
| `src/components/Hero.astro` | `altText` prop for descriptive cover image alt text |
| `src/pages/index.astro` | Enhanced LocalBusiness schema, OG image |
| `src/pages/stages-thematiques.astro` | Service + FAQ schema |
| `src/pages/ateliers-reguliers.astro` | Service + FAQ schema |
| `src/pages/un-apres-midi-couture.astro` | Service + FAQ schema |
| `src/pages/mes-creations.astro` | OG image, ImageGallery schema |
| `src/pages/mentions-legales.astro` | noIndex flag |
| `src/pages/la-couturiere.astro` | Type fix |
| `keystatic.config.ts` | `coverImageAlt` field on all page singletons |
| `src/content/pages/*/index.mdoc` | SEO descriptions, internal cross-links |
| `public/robots.txt` | AI crawler directives |
| `public/llms.txt` | AI-readable site summary |
| `public/site.webmanifest` | PWA manifest |
| `public/og-default.jpg` | Default OG image (1200x630) |
| `public/favicon.ico` | 🧵 emoji favicon |
| `public/apple-touch-icon.png` | 🧵 emoji 180x180 |
| `public/android-chrome-*.png` | 🧵 emoji 192x192 + 512x512 |

## Out of Scope
- Content freshness updates (owner handles in Keystatic)
- Multi-language / hreflang (single-language site)
- Event schema for workshop dates (dates change frequently, better suited for a Keystatic collection in a future iteration)
- Contact page creation (would require UI design authorization)
- Google Analytics / cookie consent banner
- Bing Webmaster verification (owner needs to register and provide code)
