# SEO Improver — Scheduled run, 2026-07-13 (~22:28 UTC)

Property `sc-domain:couture-tarn.fr` · GSC query snapshot pulled 2026-07-13 ~22:28 UTC · baseline: `reports/seo-improver/2026-07-13/report.md` (PR [#71](https://github.com/s-bz/atelier-des-cousettes/pull/71), merged 20:30 UTC) · prior runs: `reports/seo-improver/2026-07-13-follow-up/` (PR [#74](https://github.com/s-bz/atelier-des-cousettes/pull/74)), `reports/seo-improver/2026-07-13-followup-2/` (PR [#76](https://github.com/s-bz/atelier-des-cousettes/pull/76)), `reports/seo-improver/2026-07-13-competitor-sweep/` (PR [#77](https://github.com/s-bz/atelier-des-cousettes/pull/77)), `reports/seo-improver/2026-07-13-scheduled/` (PR [#78](https://github.com/s-bz/atelier-des-cousettes/pull/78), immediately prior run, ~42 minutes before this one).

This is the scheduled biweekly cloud run. It fires into the same calendar day as the five prior SEO runs (the environment's clock has not advanced), so GSC's reporting lag still has not cleared. But two unrelated PRs landed on `main` in between this run starting and finishing (`#80`, `#81`, both committed ~22:15–22:28 UTC, moments before this run's own commits) that materially changed the picture this run was built around — see the important correction in §1.

## 1. Executive summary

**GSC performance data is still byte-identical to the last run** — no new ranking signal exists yet (expected, same-day). This run instead executed the skill's **step 6a index coverage check for the first time** (no prior SEO run had done it) across all 29 sitemap URLs, and found **6 of 20 blog posts not indexed**, three of them (`Crawled - currently not indexed`) for 3–5 months.

**Important correction made mid-run**: this run initially diagnosed the 6 pages' problem as weak/missing internal linking and started applying link fixes. Partway through, `git fetch` surfaced that PR **#81** (`Blog: even related-article links, real sitemap lastmod, dark-mode cards`) — committed independently, ~11 minutes before this run's own commit — had **already root-cause-fixed exactly this problem**: every blog post now automatically receives 3 evenly-distributed inbound "related articles" links (`pickRelatedPosts`, cycling chronologically) instead of the old logic that always linked the 3 most recent posts and starved older ones. Verified live in production: all 6 flagged pages now carry 3–5 inbound links each (detail in §4a). **This run did not cause that fix and shouldn't take credit for it** — it landed from separate work already merged to `main`. This run's own contribution is: confirming the fix is live for the specific pages GSC flags, adding two small supplementary contextual in-body links on top of it, and — since linking is now solid for all 6 — sharpening the diagnosis for the 3 `Crawled - currently not indexed` pages toward genuine content thinness rather than a linking gap (`SEO-DECAY-006`).

GBP reviews are still unchanged (still 6 in both packs) — `SEO-GBP-004` remains the single highest-leverage open item, now six runs stagnant.

## 2. Movement since last run

None in GSC. `raw/gsc-queries.json` and `raw/gsc-query-page.json` are byte-identical to the last run's pull, 42 minutes earlier. `rankings.csv` is copied forward unchanged (`status=flat` throughout) — nothing here would be honest to report as new movement.

**Local packs** (fresh geolocated SERP pulls, Castres + Revel): both packs are byte-identical to the last run's pull for every roster listing, including our own rank (Castres 8/9, Revel 7/9, 6 reviews in both). The only change anywhere in either pack is a **non-roster** listing at Revel rank 9 (`Centre des Arts Corporels - Revel` → `Atelier d'arts de Revel`) — noted for completeness, not acted on.

**Competitor Labs rotation (step 6b/7, this run's turn: `cameleoncouturecreation.com`)**: `ranked_keywords` returned only 12 keywords, all either Albi-branded (`couture albi`, `couturière albi`) or generic pricing terms (`couture tarif`, `location machine à coudre`) — Albi is explicitly out of catchment per the project config, and this domain doesn't appear in either the Castres or Revel SERP we pulled. No usable signal, no gap. Rotation order for next run: `atelierarteli.fr` (already tracked as a roster GBP/organic listing, but its `ranked_keywords`/`domain_intersection` hasn't been pulled yet).

## 3. Did last run's changes work

| ID | Recommendation | Applied in repo? | Ranking response |
|---|---|---|---|
| SEO-CTR-001 | Homepage `seoTitle` = « Cours de couture à Revel et Verdalle, près de Castres » | **Yes**, re-confirmed live via `curl` this run | Still unchanged in GSC (too early — same snapshot as last 3 runs). |
| SEO-STRIKE-002 | Proximity-to-Castres language in homepage `seoDescription` | **Yes**, re-confirmed live (`Revel et Verdalle (Tarn), à 20 minutes de Castres` renders on the homepage) | Same — no new GSC signal. |
| SEO-CTR-003 | Trousse tutorial: retitled + new H2 | **Yes**, re-confirmed live (`<title>Coudre une trousse à fermeture éclair (20 cm) : tutoriel complet…`) | Too early to measure. |
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | Owner action, outside repo | **Still 6 reviews**, both packs, unchanged for the sixth consecutive run. This is the most stagnant item across every run so far and remains the single highest-leverage lever — on-page work is live and indexed where it can be; the Castres/Revel gap versus the top 3 is a review-volume gap now, not a content gap. |

## 4. This run's improvements

### 4a. Index coverage audit (skill step 6a) — run for the first time, then a mid-run correction

No prior SEO run (baseline through `2026-07-13-scheduled`) executed this required step. This run pulled the live sitemap (`https://couture-tarn.fr/sitemap-0.xml`, 29 URLs — 2 more content files exist in the repo, `points-couture-main-essentiels` and `coudre-jupe-elastiquee-premier-vetement`, but both have future `publishDate`s of 2026-07-14 and 2026-07-21 and are correctly excluded by `filterPublishedPosts` — not a bug) and ran `gsc.mjs inspect` on all 29 in parallel.

**23 of 29 are `Submitted and indexed`** (all non-blog pages, `mentions-legales` correctly `Excluded by 'noindex' tag`). **6 blog posts have a coverage problem**, split into two categories per the skill's own triage rule:

| Page | Coverage state | Age |
|---|---|---|
| `couture-enfants-projets-faciles` | URL is unknown to Google | 41 days |
| `couture-zero-dechet-projets-pratiques` | Discovered - currently not indexed | 27 days |
| `coutures-de-base` | Discovered - currently not indexed | 48 days |
| `choisir-machine-a-coudre` | Crawled - currently not indexed | 4 months |
| `debuter-couture-conseils` | Crawled - currently not indexed | 4 months |
| `trousse-couture-indispensables` | Crawled - currently not indexed | 5 months |

All six are past the ~2-week normal-lag window, so per the skill's rule these are flagged, not dismissed. **This run initially diagnosed weak internal linking as the cause** — a first pass found e.g. `couture-enfants-projets-faciles` with zero inbound links from other articles and `debuter-couture-conseils` linked only from an unpublished future post — and started adding manual links to fix it.

**Correction**: a routine `git fetch` mid-run turned up PR **#81**, merged to `main` independently ~11 minutes before this run's own commit, titled *"Blog: even related-article links, real sitemap lastmod, dark-mode cards"* — its description states it's a *"root-cause fix for the 6 posts stuck out of Google's index"*. It replaced the old related-articles logic (always the 3 most recent posts, which permanently starves older ones of inbound links — exactly what this run's first pass had just independently found) with `pickRelatedPosts()`, which cycles chronologically so **every** post gets exactly 3 inbound links. Verified live in production (`curl` against each of the 6 URLs):

| Page | Live inbound links now |
|---|---|
| `couture-enfants-projets-faciles` | 3 (`coutures-de-base`, `organiser-espace-couture`, `surjeteuse-a-quoi-ca-sert`) |
| `couture-zero-dechet-projets-pratiques` | 4 |
| `coutures-de-base` | 4 |
| `choisir-machine-a-coudre` | 5 |
| `debuter-couture-conseils` | 3 (previously **0** live — it was only linked from an unpublished draft) |
| `trousse-couture-indispensables` | 5 |

**This run does not take credit for that fix** — it shipped from separate work already on `main`. What this run did add on top, since the automatic related-posts widget is a generic card, not a contextual in-body link: two small, genuinely on-topic contextual links, which still carry more relevance signal than a generic "related articles" card —

- **`SEO-COVERAGE-005a`**: `idees-cadeaux-couture-faits-main`'s "bavoir bandana" gift idea (§4, "Le lot de bavoirs") now links to the fuller bavoir-bandana project in `couture-enfants-projets-faciles` — real topical overlap between the two articles' content, not a forced link.
- **`SEO-COVERAGE-005b`**: `coudre-tote-bag`'s assembly step, where the tutorial names "point droit" as the technique used, now links to `coutures-de-base` for readers who want the fuller seam-types guide.

Both edits: `src/content/blog/idees-cadeaux-couture-faits-main/index.mdoc`, `src/content/blog/coudre-tote-bag/index.mdoc`. French, proper diacritics, trailing slashes, `pnpm check` and `pnpm lint:trailing-slash` both clean.

**Owner action**: for all six, use « Request indexing » in the GSC UI (the API doesn't expose this) — internal linking is now solid site-wide, but Google's crawler hasn't revisited any of these pages since #81 deployed minutes ago, so a manual nudge is the fastest path to a fresh crawl.

**Revised diagnosis for the 3 `Crawled - currently not indexed` pages**: per the skill's own rule this state is **not a technical error** — Google crawled these and declined to index them, a quality/priority judgment, not a crawl-budget one. Now that #81 confirms internal linking was never the real blocker for these three (`choisir-machine-a-coudre` had 2 links even before #81 and still wasn't indexed; it now has 5 and the state is unlikely to flip on link count alone), the more likely cause is a **thin, overlapping beginner cluster**: `debuter-couture-conseils` ("7 conseils pour débuter", 600 words), `trousse-couture-indispensables` ("le matériel indispensable", 783 words), and `choisir-machine-a-coudre` ("comment choisir sa machine", 525 words, the shortest post on the site) all target the same beginner-onboarding intent at well under 1,000 words each, competing with each other and with the homepage for the same audience instead of each owning a distinct angle.

**`SEO-DECAY-006`** (recommendation only, not applied — a content-strategy call for the user, not a safe automated edit): consolidate these three into one substantially longer, more complete beginner's guide (merging the strongest material from each, e.g. under the `debuter-couture-conseils` slug since it's the most generic/ownable title), with 301 redirects from the other two slugs to preserve link equity. Alternatively, if the user wants to keep them separate, each needs real expansion (photos, a buying-guide comparison table for `choisir-machine-a-coudre`, etc.) to stop reading as thin to Google. Track in the next run whether any of the three flips to indexed now that #81's linking fix is live — if none do within a few crawl cycles despite solid linking, that's strong evidence for consolidation over incremental expansion.

### 4b. No further Keystatic edits this run

Beyond the two internal-link additions above, nothing else rises to a high-confidence fix: GSC has no new signal, and the local-pack/competitor data is unchanged from 42 minutes ago.

## 5. New content suggestions

None this run. Content-gap methodology retry (below) produced no evidence-backed gap — per the skill's own rule, no suggestion is better than a weak one.

**Methodology note resolved**: the last run flagged that `keyword_ideas` with multiple mixed seeds returns off-topic noise even with `closely_variants: true`. This run switched to `dataforseo_labs/google/related_keywords/live` with single seeds, as recommended — and it **is** the fix: both calls (`machine a coudre`, `surjeteuse`) returned 100% on-topic results this time (50/50 and 50/50 relevant items respectively). The remaining problem is intent, not topic: the on-topic long tail for both seeds is almost entirely retail/brand queries (`machine à coudre lidl`, `surjeteuse singer 14sh644`, `le bon coin surjeteuse`, `surjeteuse pfaff avis`) — searches for buying or comparing specific machines, which a sewing-*lessons* business (not a retailer) has no credible page-1 path to win. One genuine instructional match surfaced — `à quoi sert une surjeteuse` (search volume 590) — but we already rank for it via `surjeteuse-a-quoi-ca-sert` (~position 17–18, 3–4 impressions/28 days); it's a striking-distance candidate on volume, not a content gap, and is too thin on impressions yet to justify a dedicated `SEO-STRIKE` entry over the existing tracked set.

**Takeaway for future runs**: `related_keywords`/`keyword_ideas` seeded on our own core topics (machine, surjeteuse) will keep surfacing retail-intent noise because that's genuinely most of the search volume around sewing-machine terms. Better seeds for this business are technique/project nouns already proven in the blog's own top pages (e.g. "ourlet", "fermeture éclair", "patron couture") rather than equipment nouns.

## 6. Blockers and data caveats

- Sixth same-day firing (GSC's ~2–3 day reporting lag still has not cleared since the 20:30 UTC baseline deploy). The index coverage audit was chosen specifically because it doesn't depend on GSC's performance-data lag — coverage state reflects Google's crawl/index queue, which moved independently and had never been checked.
- **This run's timing overlapped with unrelated work landing on `main`**: PRs #79, #80, #81 were committed 22:03–22:28 UTC, spanning this run's own data-gathering window. #81 in particular fixed the exact internal-linking problem this run was mid-way through diagnosing (see §4a) — this run caught it via `git fetch` before duplicating the fix wholesale, but it's worth the next run double-checking `main` for concurrent changes before assuming a finding is novel.
- The 2 unpublished blog drafts found in `src/content/blog/` (`points-couture-main-essentiels`, publishDate 2026-07-14; `coudre-jupe-elastiquee-premier-vetement`, publishDate 2026-07-21) are correctly excluded from the sitemap by `filterPublishedPosts` — flagged during triage, confirmed not a bug, no action taken.
- One GSC-reported referring URL to the homepage, `https://couture-tarn.fr/stages-thmatiques` (missing the "é"), is not a bug either — `curl` confirms it 308-redirects correctly to `/stages-thematiques/` via the existing `vercel.json` misspelling redirect. No action needed.
- DataForSEO spend this run: 2 live SERP calls (Castres + Revel, depth 20, ~$0.004) + 2 Labs calls (`ranked_keywords` for `cameleoncouturecreation.com` $0.01284, `related_keywords` × 2 for `machine a coudre` and `surjeteuse` ~$0.02) ≈ **$0.037**, one Labs call under the 3-call cap.
- Raw API responses and all 29 `gsc.mjs inspect` results preserved in `raw/` for auditability.

*Next run: (a) once real calendar time has elapsed, check whether SEO-CTR-001/002/003 have moved GSC position/CTR, and whether #81's linking fix (plus this run's two supplementary links) got any of the 6 flagged pages to flip to indexed; (b) re-run the index coverage check (6a) — it should be a standing part of every run going forward, not a one-off; (c) get a decision from the user on `SEO-DECAY-006`'s consolidate-vs-expand question for the three `Crawled - not indexed` pages — now that linking is solid, a state that still doesn't flip is stronger evidence toward consolidation; (d) rotate the competitor Labs call to `atelierarteli.fr`; (e) GBP reviews (`SEO-GBP-004`) — still unmoved after six runs, still the biggest lever.*
