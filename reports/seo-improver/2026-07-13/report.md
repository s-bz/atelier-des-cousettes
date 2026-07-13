# SEO Improver — Baseline run, 2026-07-13

Property `sc-domain:couture-tarn.fr` · GSC window 2026-06-13 → 2026-07-11 (France) · prior window 2026-05-16 → 2026-06-13 · SERP checks from Castres and Revel via DataForSEO.

## 1. Executive summary

This is the **baseline run** — no prior report to diff against. The site earns ~700 impressions/28d but almost no clicks (**5 clicks total, ~0.7% CTR**). The single most important action is **SEO-CTR-001: put keywords and locations in the homepage `<title>`** — it is currently just « L'Atelier des Cousettes », yet the homepage carries *every* local query the site ranks for, including a **#1 organic in Revel** for « cours de couture revel » where searchers see only an unknown brand name.

Net position picture: strong in Revel, in striking distance on tutorial queries, **invisible in Castres** — the largest catchment town, 20 min away.

## 2. Movement since last run

Baseline — nothing to compare yet. Noted for next run from the prior GSC window (proto-decay, informational only):

- « atelier couture » slipped 6.3 → 13.0 (impressions grew 6 → 28)
- « cours de couture » slipped 5.7 → 10.2

Both are generic national queries where position is an average over many locales; watch, don't chase.

## 3. Did last run's changes work

N/A — baseline run.

## 4. This run's improvements

**SEO-CTR-001 — Homepage title: add keywords + locations.** *(highest priority)*
- Current: `<title>L'Atelier des Cousettes</title>` (from `title` in `src/content/pages/homepage/index.yaml`, special-cased in `BaseLayout.astro` so no suffix is added).
- Proposed title tag: **« Cours de couture à Revel et Verdalle, près de Castres | L'Atelier des Cousettes »**.
- Implementation note: `homepage.title` also feeds the Hero H1 and the LocalBusiness schema name, so don't change that field — add an optional `seoTitle` field to the homepage singleton in `keystatic.config.ts` and pass it to `BaseLayout` in `src/pages/index.astro`.
- Evidence: homepage = 459 impressions, 4 clicks (0.9% CTR), avg position 9.1; #1 organic in Revel for « cours de couture revel » with a brand-only snippet. Expected effect: CTR toward 3–5% on existing impressions — the cheapest clicks available anywhere on the site.

**SEO-STRIKE-002 — Become visible in Castres.**
- We are absent from the top 17 in Castres for « cours de couture castres » (measured SERP, 2026-07-13). Competition is weak: Facebook pages, a Superprof profile, directories — no dedicated local site above the fold. Volume is modest (20/mo exact, 390/mo « couturière castres ») but it's the biggest town in the catchment.
- Change: mention Castres honestly as proximity — homepage `seoDescription` → « Cours de couture, ateliers et stages à Revel et Verdalle (Tarn), à 20 min de Castres. … », and add « à 20 minutes de Castres » to the homepage intro paragraph (Keystatic field) and to the `seoDescription` of the three service pages.
- Expected effect: enter the Castres SERP within a few weeks; combined with SEO-CTR-001, capture the searchers the local pack doesn't satisfy (people wanting courses, not retouches).

**SEO-CTR-003 — Trousse tutorial: match the queries it almost wins.**
- `blog/coudre-trousse-fermeture-eclair/` has 50 impressions, 0 clicks, pos ~8–9 across four query variants, incl. « poser une fermeture éclair sur une trousse » (21 impr, pos 8.1) and « trousse fermeture éclair 20 cm » (17 impr, pos 8.9).
- Change in `src/content/blog/coudre-trousse-fermeture-eclair/index.mdoc`: add an H2 « Comment poser la fermeture éclair sur une trousse ? » above the relevant steps, and if the tutorial's dimensions are ~20 cm, say so in the title/meta: « Coudre une trousse à fermeture éclair (20 cm) : tuto pas à pas ».
- Expected effect: first clicks on the article and a push from pos 8–9 toward page-1 top half.

**SEO-GBP-004 — Google Business Profile (outside this repo — owner action).**
- On every measured catchment SERP, the local pack occupies the top positions (Castres: 6 pack entries; Revel: pack above our #1 organic for retouche-intent queries). The website alone cannot win those slots.
- Action for Isabelle: on the [GBP listing](https://www.google.com/maps/place/L'Atelier+des+Cousettes/@43.5208069,2.1482666,17z), set category « Cours de couture », add Revel + Castres to the service area, and ask a few current students for reviews. This is likely worth more than any on-page change for local queries.

### Deliberately not pursued

- « couturière castres / revel » (390/mo): measured SERPs show **retouching intent** — local packs and retouche shops. Wrong fight for a course business; the GSC pos 3.3 is a nationally-averaged mirage.
- « cousette » (6,600/mo, pos 5.9, 105 impr): dictionary/brand-adjacent term with no course intent; ignore despite the volume.

## 5. Blockers and data caveats

- GSC positions are averages across all of France; local reality measured from Castres/Revel via DataForSEO differs (e.g. « couturiere castres » avg 3.3 in GSC, absent from the actual Castres SERP).
- Service pages have zero recorded impressions — all local ranking power sits on the homepage. Structural, worth revisiting once the title fix lands.
- DataForSEO trial balance: ~$0.90 remaining; this run cost ≈ $0.10.
- Search volumes of 0 mean below Google Ads' reporting threshold, not literally zero.
- Raw API responses preserved in `raw/` for auditability.

*Next run: compare against this baseline; check whether SEO-CTR-001/002/003 were applied and whether « cours de couture castres » entered the top 100.*
