# SEO Improver — Scheduled run, 2026-08-26

Property `sc-domain:atelier-des-cousettes.fr` · GSC query snapshot pulled 2026-08-26 (rolling 28-day window, `startDate=2026-07-27`/`endDate=2026-08-24`) · previous window for deltas: `startDate=2026-07-11`/`endDate=2026-08-08` · baseline for narrative comparison: `reports/seo-improver/2026-08-15/report.md` (blocked run) and `reports/seo-improver/2026-07-15/rankings.csv` (last real snapshot, six weeks old) · SERP checks: fresh geolocated pulls for Castres and Revel via DataForSEO.

**The GSC credential is fixed.** `node scripts/seo/gsc.mjs sites` now succeeds and returns a proper service-account-authenticated response — the `ERR_CRYPTO_SIGN_KEY_REQUIRED` blocker that stopped the 2026-08-01 and 2026-08-15 runs is resolved (someone rotated `GSC_CREDENTIALS_JSON` to a real service-account key in the interim). This run has full real data for the first time in six weeks.

## 1. Executive summary

**The single most important action this run: register a GSC "Change of Address" from `couture-tarn.fr` to `atelier-des-cousettes.fr`.** `gsc.mjs sites` lists them as two separate, still-active Search Console properties. The site itself migrated cleanly (the old domain 301-redirects correctly, verified with `curl -D -`), but Google has not finished reconciling the two properties: two live pages (`la-couturiere`, `blog/entretenir-machine-a-coudre`) still carry `couture-tarn.fr` as Google's chosen canonical instead of the correct `atelier-des-cousettes.fr` URL, the old domain still surfaces independently in a live Revel organic SERP pull (rank 18), and the branded query "l'atelier des cousettes" is split across two different pages (homepage pos 6.1, `/ateliers-reguliers/` pos 10.5) instead of converging on the homepage at #1 — a classic symptom of Google still treating this as two related-but-unmerged sites. None of this is fixable from the repo; it needs the domain-migration tool in Search Console Settings, which only an owner with GSC access can run.

Second finding, resolving a caveat from the last two blocked runs: **"cours de couture castres" really is a strong ranking, not a rank-21 regression.** GSC's own 28-day average puts it at position **4.8** with **3 clicks on 5 impressions (60% CTR)** — DataForSEO's single live pulls (rank 5, then 20, then 21 across three checks) were SERP noise from an unlocalized/non-personalized crawl, not a real position. Per the skill's own rule (GSC is primary, DataForSEO is the competitive layer), this closes the open question — no regression happened.

Third: the **index coverage picture is worse than expected**. Of 85 sitemap URLs, only **21 are indexed**; 44 are `Discovered — currently not indexed`, 18 are `URL is unknown to Google` (including `/contact/` and `/conditions/`, both linked from the header/footer on every page), and the 2 canonical-mismatch pages above. The three `SEO-DECAY-006` posts flagged since 2026-07-15 actually **regressed** — from `Crawled — currently not indexed` to `Discovered — currently not indexed` (Google un-crawled them, in effect) — likely crawl-budget dilution from the large glossary + blog batch added 2026-08-03 (55 glossary terms + 11 posts, all still mostly unindexed three weeks later). See §4a.

**One Keystatic content fix applied this run** (`SEO-CTR-007`, §4): the top non-branded query on the trousse tutorial, "trousse fermeture éclair 20 cm" (35 impressions, pos 10.9), didn't have "20 cm" in the actual `<title>` tag even though the on-page `title` field already had it. Fixed.

## 2. Movement since last run

**GSC data is real for the first time since 2026-07-15** — six weeks of gap, so most deltas below compare against the pre-migration `couture-tarn.fr` baseline rather than a clean two-week diff; read them as directional, not precise week-over-week noise-free numbers. Full table in `rankings.csv`.

- **"cours de couture castres" — real, strong, resolved.** Pos 4.8, 60% CTR, 3 clicks. See §1.
- **"couturiere revel" (unaccented) — real growth.** 3 → 30 impressions, pos 6.7 → 7.5 (roughly flat). The accented variant "couturière revel" (11 impressions in the old snapshot) now shows **zero** impressions in both this window and the prior one — almost certainly a GSC query-bucketing shift after the domain move, not lost traffic: the combined revel-couturière cluster is up, not down. Same pattern for "cours de couture revel" and "cours de couture tarn" (both zero this run, both very low-volume before) — flagged as `dropped` in `rankings.csv` but not read as a real loss.
- **"l'atelier des cousettes" (branded) — split and weak.** 21 combined impressions, 0 clicks, split pos 6.1 (homepage) / pos 10.5 (`/ateliers-reguliers/`). See §1 — tied to the unresolved domain migration, not a content problem.
- **"cousette" — a false opportunity, not worth chasing.** 65 impressions, pos 5.5, **0% CTR**. Pulled the live SERP: position 1 is `cousette.com` (a fabric/mercerie e-commerce brand with the literal name "Cousette"), plus Larousse and CNRTL dictionary definitions ("cousette" is a standalone French word). The zero clicks aren't a CTR bug — searchers want the fabric shop or the dictionary, not a sewing school. No action recommended; do not spend effort optimizing toward this term.
- **"atelier de couture" / "atelier couture" — mixed, low-confidence.** One up (14.7, +1.2), one down (13.6, −1.0), both single-digit-impression noise territory.
- **Local packs (fresh DataForSEO pulls, Castres + Revel, depth 20):**
  - **Castres — improved.** L'Atelier des Cousettes **rank 9 → 7** (5.0★/6, reviews still flat). Déco Couture also climbed (3 → 2, 20 reviews unchanged). Mercerie Floriane remains the outlier non-roster threat at #6 with 158 reviews.
  - **Revel — continued slide, and the competitor gap is now real.** L'Atelier des Cousettes **rank 7 → 8 → 9** across the last three checks, reviews flat at 6 throughout. `Atelier Artéli` **rank 9 → 8 → 6 → 7** and reviews **3 → 4 → 5 → 6** over the same four checks — this run its rank gave back one spot (6→7) but its review count caught all the way up to ours (6 = 6) while still outranking us. The trend `SEO-GBP-004` has been warning about for nine-plus runs is no longer hypothetical: a direct competitor closed the review gap from scratch while ours didn't move at all.
  - `latelierdescousettes.fr` (name-collision watch): absent from both fresh pulls this run (was rank 26 in Revel last run) — no action, keep watching.
  - Old domain `couture-tarn.fr` still appears as an independent organic result in the Revel pull (rank 18) — tied to the Change of Address gap in §1.

## 3. Did last run's changes work

Nothing was applied in 2026-08-01 or 2026-08-15 (both blocked), so this is the first real check-in since 2026-07-15:

| ID | Recommendation | Applied? | Ranking response |
|---|---|---|---|
| SEO-CTR-001 | Homepage `seoTitle` = « Cours de couture à Revel » (+ Verdalle/Castres framing) | Yes, live | Homepage: 311 impressions, pos 9.2, 1.6% CTR this window — in the expected range for position ~9 (2–5%), slightly low but not a clear miss. No isolable pre/post signal (too much else changed — domain migration, 6-week gap). |
| SEO-CTR-003 | Trousse tutorial retitled + new H2 | Yes, live | Page holds pos 10.9–19.9 depending on query blend; top query "trousse fermeture éclair 20 cm" at 2.9% CTR, roughly in range for pos ~11. See `SEO-CTR-007` below for the follow-up fix. |
| SEO-COVERAGE-005a | Internal link `idees-cadeaux-couture-faits-main` → `couture-enfants-projets-faciles` | Yes, live | Still `Discovered - currently not indexed`, unchanged. |
| SEO-COVERAGE-005b | Internal link `coudre-tote-bag` → `coutures-de-base` | Yes, live | **Regressed**: `Discovered - currently not indexed` → `URL is unknown to Google`. |
| SEO-DECAY-006 | Consolidate-vs-expand call on 3 thin beginner posts — awaiting user decision | Not applied (still awaiting the user) | **Regressed**: all three moved from `Crawled - currently not indexed` to `Discovered - currently not indexed` — Google un-crawled them. Six weeks on with no user decision; see §4a for a sharper recommendation. |
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | Owner action, outside repo | Still 6 everywhere. Now the clearest case yet: Atelier Artéli went 3→6 reviews (doubled) over the same period ours sat at 6→6, and it now consistently outranks us in the Revel pack. |

## 4. This run's improvements

**SEO-CTR-007 — applied.** `src/content/blog/coudre-trousse-fermeture-eclair/index.mdoc`: `seoTitle` changed from *"Coudre une trousse à fermeture éclair : tutoriel complet"* to *"Coudre une trousse à fermeture éclair 20 cm : tutoriel"* (54 chars). The on-page `title` field already said "(20 cm)" but the actual `<title>` tag (built from `seoTitle`, per `src/pages/blog/[slug].astro:88`) did not — and "trousse fermeture éclair 20 cm" is this page's single highest-impression query (35 impressions/28d, pos 10.9, 2.9% CTR). Matching the SERP title to the literal query should lift CTR at that position; expect the effect to show up in the next run's GSC pull once it's re-crawled and re-served.

### 4a. Index coverage audit (skill step 6a)

Ran `gsc.mjs inspect` on all 85 sitemap URLs (parallelized, 8 concurrent):

| Coverage state | Count |
|---|---|
| Submitted and indexed | 21 |
| Discovered - currently not indexed | 44 |
| URL is unknown to Google | 18 |
| Duplicate, Google chose different canonical than user | 2 |

Notable items, beyond the 55 glossary/blog pages published 2026-08-03 (23 days old, past the "normal lag" window but a huge single-day batch that plausibly still needs time to work through crawl budget on a small site):

- **`/contact/` and `/conditions/` — `URL is unknown to Google`.** Both are linked from the site-wide header/footer on every single page, so this isn't a linking gap — it reads as Google deprioritizing thin utility pages behind the recent bulk-content push. **Owner action**: hit "Request indexing" on both in the GSC UI (the API doesn't expose this).
- **`la-couturiere` and `blog/entretenir-machine-a-coudre` — canonical points at the dead `couture-tarn.fr` URL.** Tied to the unresolved Change of Address (§1) — the fix is the domain-migration tool, not a content or code change; a manual "Request indexing" on the correct URL may also nudge Google to re-decide the canonical sooner.
- **`/ateliers-reguliers/inscription/`, `/reserver/retour/`, `/seances-sans-engagement/reserver/`, `/stages-thematiques/reserver/` — `URL is unknown to Google`.** All four carry `noIndex` in the page source (confirmed in `src/pages/**/*.astro`) — this is the expected, intentional state for booking/confirmation pages, not a problem. Not flagged as an issue.
- **The three `SEO-DECAY-006` posts and `coutures-de-base` regressed** rather than improved (see §3). This is now real evidence, not a timing question: six weeks of adequate internal linking (per the 2026-07-15 audit) hasn't moved any of them toward indexing, and the trend is backward, not stalled. **Sharpened recommendation**: this needs the user's consolidate-vs-expand call now — carrying it forward unresolved for a seventh time isn't gathering new information anymore.

### 4b. Competitor Labs rotation (steps 6b/7)

This run's turn: `atelierdecouture.fr` (`ranked_keywords`, France, limit 50). 13 keywords returned, all either branded ("l atelier d elise" variants, vol 6,600) or Toulouse-geo ("atelier couture toulouse", "cours de couture à toulouse" — ~90 min away, out of catchment) or off-angle ("cap couture", a formation/diploma search, not our offer). No usable gap — consistent with every other roster domain tried so far. **Next run's rotation: `lacouzeuse.org`** (untried; remaining after this: `acde-couture.fr`, `atelieraslena.fr`, `latelierdesgourdes.fr`).

### 4c. Content-gap discovery (step 7)

`keyword_ideas` seeded from `surjeteuse`, `machine à coudre`, `débuter en couture`, `trousse fermeture éclair` (50 results). Dominated by high-volume machine-brand/retailer terms (`machine à coudre singer/lidl/pfaff/brother`, 2,400–14,800 vol) — clear buy-a-machine intent competing against Amazon/Lidl/manufacturer sites, no plausible page-1 path for a workshop business — plus off-topic noise (`crochet débutant`, `la machine du moulin rouge`) and `patron couture gratuit` (6,600 vol, download-resource intent already ruled out 2026-07-15). Nothing cleared the bar for a `SEO-NEW` suggestion. Per the skill's rule, no suggestion is better than a weak one.

## 5. New content suggestions

None this run — see §4c.

## 6. Blockers and data caveats

- **GSC credential is now fixed** (see header) — no blocker this run.
- Six-week data gap (last real snapshot 2026-07-15) means most deltas in `rankings.csv`/§2 span the domain migration itself, not a clean isolated period — read directional movement with that in mind; the next run should be the first genuinely clean two-week window.
- DataForSEO spend this run: 2 live SERP calls (Castres + Revel, depth 20) + 1 diagnostic SERP call (`cousette`, depth 15) ≈ $0.012, + 2 Labs calls (`ranked_keywords` for `atelierdecouture.fr` ≈ $0.013, `keyword_ideas` 4-seed ≈ $0.02) ≈ **$0.045 total**, 2 of 3 Labs calls used.
- Several previously-tracked accented query variants show zero impressions this window (§2) — read as GSC query-bucketing changes post-migration, not real losses, but worth re-confirming next run once the window is fully post-migration.
- Raw `gsc.mjs inspect` results (all 85 URLs) and DataForSEO responses saved under `raw/` for auditability.

*Next run should: (a) do a first clean two-week diff now that the credential and domain are both settled; (b) check whether the GSC "Change of Address" got registered and whether the two canonical-mismatch pages resolved; (c) verify `/contact/` and `/conditions/` flipped to indexed after "Request indexing"; (d) reconfirm the Revel local-pack slide and Atelier Artéli's review parity; (e) `SEO-GBP-004` — now the strongest evidence yet that this is costing rank, not just stagnation; (f) rotate the competitor Labs call to `lacouzeuse.org`; (g) push the user for a decision on `SEO-DECAY-006` — six weeks pending, and the trend just went backward.*
