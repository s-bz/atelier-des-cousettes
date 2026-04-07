# Code Review — 20260407-1

**Scope:** Blog feature, CMS migration of homepage cards/hero image/CTA, service page schema offers refactor.
**Files reviewed:** `keystatic.config.ts`, `src/pages/index.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, `src/pages/ateliers-reguliers.astro`, `src/pages/stages-thematiques.astro`, `src/pages/un-apres-midi-couture.astro`, `src/components/BlogCard.astro`, `src/components/ContentPage.astro`, `src/components/Hero.astro`, `src/pages/mes-creations.astro`

---

## Summary

The blog feature and CMS migration are well-structured and follow project conventions. Eight issues were identified and all have been resolved. Build passes with 0 errors, 0 warnings.

---

## Critical Issues

None. No security vulnerabilities, data loss risks, or build-breaking bugs identified.

---

## Issues Found & Resolved

### 1. FIXED — Image resolution logic duplicated in 5+ places (DRY violation)

Extracted shared utility to `src/utils/images.ts` with three functions:

- `resolveImagePath()` — finds the correct glob key from a raw CMS path
- `resolveImage()` — resolves to `ImageMetadata` for `<Image>` component
- `resolveImageUrl()` — resolves to absolute URL string for OG images/schema

Refactored 6 files: `index.astro`, `blog/[slug].astro`, `blog/index.astro`, `ContentPage.astro`, `Hero.astro`, `mes-creations.astro`. Each image resolution is now a single function call.

### 2. FIXED — `LocalBusiness` schema had hardcoded address

Added structured address fields to `siteSettings` singleton: `streetAddress`, `addressLocality`, `postalCode`, `addressRegion`. Seeded with existing data. `index.astro` schema now reads from CMS.

### 3. FIXED — `blogIndex` had hardcoded fallback strings

Replaced optional chaining + 3 fallback strings with `if (!page) throw new Error(...)` pattern matching all other pages. Template now uses `page.title`, `page.subtitle`, `page.seoDescription` directly.

### 4. FIXED — Service schema names were hardcoded

All 3 service pages (`ateliers-reguliers`, `stages-thematiques`, `un-apres-midi-couture`) now use `page.title` and `page.seoDescription` from CMS in their schema markup instead of hardcoded strings.

### 5. FIXED — `"@type": "Offer" as const` was a no-op

Removed `as const` from all 3 service pages. It had no runtime effect on the JSON-LD output.

### 6. FIXED — Schema `price` was a string, not a number

All 3 service pages now use `Number(o.price)` to coerce the price field to a number in JSON-LD, as required by schema.org `Offer.price`.

### 7. FIXED — Non-null assertions on `publishDate`

- `blog/index.astro`: Added type-narrowing filter (`post is ... & { entry: { publishDate: string } }`) so `publishDate` is typed as `string` after filtering. Removed `!` assertion.
- `blog/[slug].astro`: Replaced `post.publishDate!` with `post.publishDate ?? ''`.

### 8. FIXED — Inconsistent `@id` format across pages

Normalized all schema `@id` references to use `${siteUrl}/#organization` and `${siteUrl}/#website` consistently. Previously, `index.astro` used `${Astro.site}#...` (with trailing slash from URL object) while other pages used `${siteUrl}/#...` (origin without trailing slash). `mes-creations.astro` was missing the slash entirely.

---

## Remaining Notes (Not Bugs)

- **`hasOfferCatalog` in LocalBusiness schema** still has hardcoded service names/URLs. These could be derived from service page singletons at build time, but the complexity isn't justified for 3 rarely-changing items.
- **`priceRange` and `openingHoursSpecification`** in LocalBusiness remain hardcoded. Acceptable since they change infrequently.
- **`href` on service cards** is a free-text field. The label guides the editor to use internal paths. `fields.url()` would enforce format but would require `https://` prefix which is wrong for internal links. Current approach is acceptable for a non-public CMS.
- **`coverImageAlt`** is repeated inline 9 times in `keystatic.config.ts`. Could be bundled with `coverImageField()` into a `coverImageFields(slug)` helper returning both fields. Low priority.

---

## Positive Observations

- **`schemaOffersField()` helper** is a clean, DRY abstraction used correctly in 3 singletons.
- **`src/utils/images.ts`** now centralizes all image resolution logic — a bug fix or pattern change only happens in one place.
- **Service pages are fully CMS-driven.** Schema offers, page titles, and descriptions all come from Keystatic.
- **`BlogCard` is well-scoped.** Single responsibility, clean props, French locale for dates.
- **`resolvedCards.length > 0` guard** prevents rendering an empty grid if no cards are configured.
- **`getStaticPaths` + `reader.collections.blog.all()`** is the correct Astro pattern for static collection routes.
- **All content is now CMS-managed.** Zero hardcoded user-facing text in `.astro` page files (excluding schema structural values like `@type`, `@context`, `"Cours de couture"`).
