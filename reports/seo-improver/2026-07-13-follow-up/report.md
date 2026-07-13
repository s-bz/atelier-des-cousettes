# SEO Improver — Follow-up run, 2026-07-13 (same-day as baseline)

Property `sc-domain:couture-tarn.fr` · GSC query snapshot pulled 2026-07-13 ~20:55 UTC · baseline report: `reports/seo-improver/2026-07-13/report.md` (PR [#71](https://github.com/s-bz/atelier-des-cousettes/pull/71), merged 2026-07-13 20:30 UTC by the site owner).

## 1. Executive summary

This run fired roughly **25 minutes after** the baseline run's PR merged. That is far too soon for Google Search Console or Google's index to reflect anything: **GSC's query-level data pulled just now is byte-identical to the baseline** (same 101 rows, same clicks/impressions/position to the decimal). There is no ranking movement to report yet, and none is expected until GSC's own reporting lag (typically 2–3 days) plus the time for Google to actually re-crawl the deployed pages.

Rather than re-running the same analysis and inventing new content changes on stale data, this run does three useful things instead: (1) confirms the baseline's code changes are genuinely live in the repo, (2) re-measures the Castres and Revel SERPs at greater depth and finds a real gap in the baseline's method — **the business's Google Business Profile already appears in both local packs, just not in the top 3** — which sharpens SEO-GBP-004 with concrete competitive numbers, and (3) makes no new content changes, since no new evidence justifies any.

**No new commits to Keystatic content this run.** The next run that actually measures movement should happen after GSC has had several days to reprocess (i.e., the next scheduled biweekly firing, not an immediate re-run).

## 2. Movement since last run

None measurable. `rankings.csv` in this run is a copy of the baseline's 18 tracked keywords with `status=flat` and `delta=0` across the board — confirmed identical clicks, impressions, and average position for all 101 rows returned by Search Console, not just the 18 tracked ones. This is expected given the ~25-minute gap, not a sign the changes didn't work.

## 3. Did last run's changes work

| ID | Recommendation | Applied in repo? | Ranking response |
|---|---|---|---|
| SEO-CTR-001 | Homepage `seoTitle` = « Cours de couture à Revel et Verdalle, près de Castres \| L'Atelier des Cousettes » | **Yes** — confirmed in `src/content/pages/homepage/index.yaml:3`, wired through `keystatic.config.ts` and `src/pages/index.astro:61` (`title={homepage.seoTitle || homepage.title}`) | Too early — GSC unchanged; Google's cached snippet for the Revel SERP still shows the old, Castres-free description (see §5), meaning Google has not yet re-crawled the live page |
| SEO-STRIKE-002 | Add proximity-to-Castres language to homepage `seoDescription`/intro and service pages | **Yes** — `src/content/pages/homepage/index.yaml:4-6,13` now reads "…de Castres. Tous niveaux…" and "…à 20 minutes de Castres" | Too early to measure; not yet visible in live SERP snippets either |
| SEO-CTR-003 | Trousse tutorial: add H2 matching striking-distance queries | Not independently re-verified this run (no new blog query data to check against) — recommend confirming in the next real run | N/A |
| SEO-GBP-004 | Owner action: GBP category + service area + reviews | Owner action, outside repo — see refined finding below | Refined, not resolved |

## 4. This run's improvements

No new content changes are proposed this run — there is no fresh ranking signal to justify any, and re-applying variations of the baseline's fixes on identical data would be guesswork dressed up as evidence. One data-quality correction to carry into the next run:

**SEO-GBP-004 (refined) — the GBP listing already ranks, it's short on reviews, not visibility.**
- Live SERP pulls just now (`raw/serp-castres-depth20.json`, `raw/serp-revel-depth20.json`, depth 20 vs. the baseline's depth 10) show **L'Atelier des Cousettes' Google Business Profile already appears in the extended local pack in both towns**:
  - Castres, « cours de couture castres »: rank 8 of the extended pack (rank_absolute 29, page 2) — 5.0★, **6 reviews**. Top-3 pack: La Fée Dymotite (5.0★, 23 reviews), Déco Couture (4.9★, 20 reviews), L'Atelier de Josie (5.0★, 4 reviews).
  - Revel, « cours de couture revel »: rank 30 (page 2) — 5.0★, 6 reviews. Top-3 pack: Créa'Isi (5.0★, 31 reviews), Les Créations d'Alice (5.0★, **6 reviews** — same count, ranks higher), Cécil'Création (5.0★, 6 reviews).
  - The baseline's depth-10 pull only captured the top organic results and missed this extended pack entirely, so "invisible in Castres" was an artifact of query depth, not literal absence. Correcting: the profile exists, is rated 5.0, and is discoverable — it just isn't winning the top-3 slot Google shows by default.
  - Revel's data point (a 6-review competitor outranking a 6-review listing) shows review count isn't the only lever — category match and proximity likely matter too — but review count is still the most actionable gap: top-3 in Castres runs 20–23 reviews vs. our 6.
- Sharper owner action for Isabelle: keep the GBP category as-is if already « Cours de couture », and prioritize collecting **10–15 more reviews** to approach parity with Castres' top 3 (20–23 reviews) — this is a bigger lever than category/service-area tweaks alone, which the baseline over-weighted.

## 5. Blockers and data caveats

- This is an out-of-cycle, same-day follow-up, not a real second measurement window. GSC needs its own ~2–3 day processing lag on top of the time for actual searcher behavior to shift; the next run with real signal should be the next scheduled biweekly firing (or later), not sooner.
- Google's live organic snippet for the Revel SERP (`raw/serp-revel-depth20.json`, result #6) still shows the **pre-fix** meta description, confirming the page hasn't been re-crawled since the deploy — expected, not a failure of SEO-CTR-001/002.
- DataForSEO spend this run: 3 live SERP calls × ~$0.002–0.004 ≈ $0.01. Trial balance should still be close to the ~$0.90 the baseline reported remaining.
- `rankings.csv` this run intentionally mirrors the baseline's 18 tracked keywords with `flat`/`delta=0` rather than re-deriving a "new" tracked set from identical GSC data.
- Raw API responses preserved in `raw/` for auditability, including the depth-20 SERP pulls that surfaced the extended-local-pack finding.

*Next run: pull GSC once real time has passed since PR #71's deploy; check whether SEO-CTR-001 (title/CTR) and SEO-STRIKE-002 (Castres proximity) show up in impressions/CTR/position, and whether Google's cached snippets have refreshed to the new copy. Re-verify SEO-CTR-003 against fresh blog-query data. Track GBP review count over time against the Castres top-3 (20–23) and Revel top-3 (6–31) benchmarks captured here.*
