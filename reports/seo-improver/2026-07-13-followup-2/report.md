# SEO Improver — Second follow-up run, 2026-07-13 (~40 min after baseline deploy)

Property `sc-domain:couture-tarn.fr` · GSC query snapshot pulled 2026-07-13 ~21:08 UTC · baseline: `reports/seo-improver/2026-07-13/report.md` (PR [#71](https://github.com/s-bz/atelier-des-cousettes/pull/71), merged 20:30 UTC) · prior follow-up: `reports/seo-improver/2026-07-13-follow-up/report.md` (PR [#74](https://github.com/s-bz/atelier-des-cousettes/pull/74), merged 21:01 UTC) · skill update: content-gap discovery step landed in PR [#75](https://github.com/s-bz/atelier-des-cousettes/pull/75), merged 21:06 UTC.

## 1. Executive summary

This run fired ~13 minutes after PR #74 and ~40 minutes after the baseline deploy — still inside GSC's 2–3 day reporting lag, so **no ranking movement is measurable yet** (confirmed below: the query snapshot is again byte-identical). Rather than repeat that finding without adding anything, this run does two things the prior two didn't:

1. **Verifies the fix is genuinely live in Google's index, not just in the repo.** A fresh depth-20 SERP pull shows Google has already re-crawled the homepage: both the Castres organic listing (rank 27) and the Revel #1 organic now show the **new** meta description (« Cours de couture, ateliers et stages à Revel et Verdalle (Tarn). Tous niveaux, petits groupes, de 25€ à 90€. Avec Isabelle, couturière diplômée CAP. »), where the prior follow-up (25 minutes earlier) still saw the old snippet. The re-crawl is real; only GSC's own performance reporting is lagging.
2. **Exercises the new content-gap discovery step (Step 7)** for the first time, now that PR #75 has landed. Result: **no `SEO-NEW` suggestion this run** — the one competitor with a plausible catchment-gap story (`atelierarteli.fr`, seen in the Revel local pack) has zero ranked keywords in DataForSEO's Labs index, and the topic-expansion `keyword_ideas` pull came back dominated by unrelated high-volume noise (« le bon coin », « avis de décès », etc.) rather than sewing-adjacent terms — see §5 for why, and a fix for next run. Per the skill's own rule, no suggestion is better than a weak one, so this section is skipped rather than padded.

**No new Keystatic edits this run** — nothing here rises to "high-confidence fix" the way the baseline's three did.

## 2. Movement since last run

None measurable, and expected: `raw/gsc-queries.json` is byte-identical to the prior follow-up's pull (all 101 query rows diffed programmatically — 0 changes in clicks, impressions, or position). `rankings.csv` mirrors the tracked set unchanged, `status=flat`/`delta=0` across all 18 keywords.

The GBP local-pack snapshot is also unchanged from the prior follow-up: L'Atelier des Cousettes still sits at rank 29 (Castres, 5.0★, 6 reviews) and rank 30 (Revel, 5.0★, 6 reviews) — consistent, not surprising given the ~13-minute gap.

## 3. Did last run's changes work

| ID | Recommendation | Applied in repo? | Ranking response |
|---|---|---|---|
| SEO-CTR-001 | Homepage `seoTitle` = « Cours de couture à Revel et Verdalle, près de Castres \| L'Atelier des Cousettes » | **Yes**, confirmed live via `curl` against the production site — the deployed `<title>` matches exactly | GSC unchanged (too early); **but the live Google snippet already reflects the new copy** on the Castres and Revel SERPs (see §1) — the re-crawl has happened, so once GSC's lag clears this should start moving |
| SEO-STRIKE-002 | Add proximity-to-Castres language to homepage `seoDescription`/intro | **Yes**, confirmed live via `curl` — production meta description matches the Keystatic content exactly | Same as above: not yet in GSC, but now visible in Google's live organic snippet for both Castres and Revel |
| SEO-CTR-003 | Trousse tutorial: H2 matching striking-distance queries + retitle with "20 cm" | **Re-verified this run** — confirmed in `src/content/blog/coudre-trousse-fermeture-eclair/index.mdoc`: title is « Coudre une trousse à fermeture éclair (20 cm) : tutoriel complet », and `## Étape 2 : comment poser la fermeture éclair sur une trousse ?` is present | Too early to measure (same GSC snapshot) |
| SEO-GBP-004 | Owner action: GBP reviews, refined in the prior follow-up to a concrete target (10–15 more reviews vs. Castres' top-3 20–23) | Owner action, outside repo | Unchanged this run: still 6 reviews, rank 29 in Castres / rank 30 in Revel — no movement expected in 13 minutes |

## 4. This run's improvements

No new content changes. There's no fresh ranking or CTR evidence this run that the baseline and first follow-up haven't already acted on, and inventing variations on identical data would be guesswork, not evidence-driven work. The one genuinely new finding — Google's live snippets have already refreshed — is a confirmation signal, not something requiring a code change.

## 5. Content-gap discovery (Step 7, first real attempt)

This is the first run since PR #75 added the content-gap step. Two lines were attempted, both inconclusive — reported honestly rather than forced into a weak suggestion:

- **Competitor gap (`ranked_keywords` for `atelierarteli.fr`)**: this domain appeared in the Revel local pack (rank 32, 5.0★, 3 reviews — `raw/serp-revel-depth20.json`). DataForSEO Labs returned `items_count: 0` for it (`raw/labs-ranked-keywords-atelierarteli-fr.json`) — the site is too small/thin to have organic keyword data in Labs' index. Not a bug, just not a usable data source; no larger, well-established competitor surfaced in this run's SERPs to try instead (the Castres top-3 — La Fée Dymotite, Déco Couture, L'Atelier de Josie — are GBP-only listings without a dedicated content site worth a `ranked_keywords` pull).
- **Topic expansion (`keyword_ideas` seeded from "machine a coudre", "debuter couture", "surjeteuse")**: returned 100 items (`raw/labs-keyword-ideas-machine-debuter-surjeteuse.json`), ordered by search volume — but **zero** of them contain any sewing-related term. The top results are generic French high-volume queries unrelated to the seeds (« le bon coin », « solitaire gratuit », « avis de décès »...). The endpoint's default category-clustering mode appears to broaden past the seed topic when results are sorted by raw volume; `total_count` was 2.6M, meaning the sort surfaced generic head terms from unrelated categories rather than close variants of the seeds. **Methodology note for next run**: request with `"closely_variants": true` (or filter client-side for seed-substring matches) instead of sorting the raw category-cluster output by volume — the current call shape isn't fit for purpose.

No `SEO-NEW` suggestion is proposed this run. Re-attempt topic expansion next run with the corrected call shape before concluding there's no viable blog topic in this cluster.

## 6. Blockers and data caveats

- Same as the prior follow-up: this is an out-of-cycle, same-day run (three runs today), far inside GSC's ~2–3 day reporting lag. The next run with real GSC signal should be the next scheduled biweekly firing.
- DataForSEO: one transient error this run — the first `ranked_keywords` call for `atelierarteli.fr` (bare domain, no `www.`) returned `40201` ("unusual activity, temporarily paused"); an immediate retry with the same body succeeded with a normal `20000`/empty-result response, and a follow-up attempt against `www.atelierarteli.fr` hit the same `40201` again. Account-level `appendix/user_data` calls succeeded throughout, so this reads as endpoint-level flakiness rather than an account block — worth a quick check next run if it recurs.
- DataForSEO spend this run: 2 live SERP calls (Castres + Revel, depth 20) + 2 successful Labs calls ≈ **$0.044** (SERP $0.008, Labs $0.036: keyword_ideas $0.024, ranked_keywords $0.012). One failed Labs call cost $0. Total against the ~$0.89 balance reported after the prior follow-up.
- Raw API responses preserved in `raw/` for auditability.

*Next run: this should be the actual next scheduled biweekly firing, with enough elapsed time for GSC to reflect the baseline's changes. Check (a) whether SEO-CTR-001/002 moved CTR and position on the homepage now that Google's snippet is confirmed refreshed, (b) SEO-CTR-003's blog queries, (c) GBP review count progress against the Castres (20–23) and Revel (6–31) top-3 benchmarks, and (d) retry the content-gap topic-expansion pull with `closely_variants: true` before writing off that cluster.*
