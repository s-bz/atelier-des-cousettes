# SEO Improver — Scheduled run, 2026-07-13 (~21:46 UTC)

Property `sc-domain:couture-tarn.fr` · GSC query snapshot pulled 2026-07-13 ~21:46 UTC · baseline: `reports/seo-improver/2026-07-13/report.md` (PR [#71](https://github.com/s-bz/atelier-des-cousettes/pull/71), merged 20:30 UTC) · prior runs: `reports/seo-improver/2026-07-13-follow-up/` (PR [#74](https://github.com/s-bz/atelier-des-cousettes/pull/74)), `reports/seo-improver/2026-07-13-followup-2/` (PR [#76](https://github.com/s-bz/atelier-des-cousettes/pull/76)), `reports/seo-improver/2026-07-13-competitor-sweep/` (PR [#77](https://github.com/s-bz/atelier-des-cousettes/pull/77), competitor roster baseline).

This is the scheduled biweekly cloud run. It fires into the same day as the prior three interactive runs (per the environment's clock), so GSC's ~2–3 day reporting lag still has not cleared — but this run adds real, non-duplicate value: it re-verifies the baseline fixes are still live, re-measures the two geolocated local packs (Castres/Revel) with fresh SERP pulls, rotates the competitor Labs call to the next roster entry, and retries the content-gap methodology fix flagged at the end of the last run.

## 1. Executive summary

**No ranking movement is measurable in GSC yet** (confirmed below — the 101-row query-only pull is byte-identical to the prior run's, 38 minutes earlier). The single most important action from this run is **outside the repo**: GBP review counts for our own listing (6) and the tracked competitors (20–31 in the packs we checked) are unchanged again — this remains the highest-leverage lever until the owner acts on it (SEO-GBP-004).

Two things this run adds on top of "still too early":
1. Both geolocated local-pack pulls (Castres, Revel) confirm our GBP listing's in-pack rank is unchanged (Castres rank_group 8/9, Revel rank_group 7/9; the confusingly large "rank 29"/"rank 21" numbers in this and prior reports are `rank_absolute` — position on the full page, organic and local mixed — not our rank within the 9-listing local pack, which is what actually matters competitively).
2. The keyword_ideas methodology bug flagged at the end of the last run (`closely_variants: true`) was retried and **did not fix the root problem** — see §5 for the diagnosis and a concrete next step.

**No new Keystatic edits this run.** Nothing here rises to a high-confidence fix beyond what the baseline and first follow-up already made.

## 2. Movement since last run

None measurable. `raw/gsc-queries.json` (query-only, 101 rows) is byte-identical to `2026-07-13-followup-2/raw/gsc-queries.json` — diffed with `diff -q`, zero differences. `rankings.csv` mirrors the tracked 18-keyword set unchanged: `status=flat`/`delta=0` throughout.

**Local packs** (fresh geolocated SERP pulls this run, `location_name` set to the town, not country-level France):

| Town | Our GBP rank in pack (of 9) | rating/reviews | vs. prior pull |
|---|---|---|---|
| Castres (`cours de couture castres`) | 8 | 5.0★ / 6 | unchanged (rank_group 8, follow-up-2 same) |
| Revel (`cours de couture revel`) | 7 | 5.0★ / 6 | unchanged (rank_group 7, follow-up-2 same) |

**Competitor movement** worth noting (from the same two SERP pulls, no extra spend — step 6b):
- **Castres GBP pack reordered at the top**: La Fée Dymotite and Déco Couture swapped — La Fée Dymotite is now rank 1 (was 2 in the 2026-07-13 baseline sweep), Déco Couture dropped to rank 2 (was 1). Review counts are unchanged for both (23 and 20), so this reads as ordinary local-pack ranking volatility rather than a review-driven shift — flagged, not acted on.
- **atelierarteli.fr gained in the Revel results**: organic rank 7 → 5, and its GBP listing (Atelier Artéli) rank 9 → 8 — small but consistent movement in the same direction on both surfaces for this competitor.
- **Name-collision watch**: latelierdescousettes.fr, which ranked #14 organic for `cours de couture revel` in the prior follow-up, **is no longer in the top 20** for that query this run. Not currently a threat on this keyword.
- The other 9 catchment towns from the baseline competitor sweep were not re-pulled this run (budget discipline — see §6); their roster rows are unchanged from `2026-07-13-competitor-sweep/competitors.csv` because they were not re-measured, not because nothing moved.

## 3. Did last run's changes work

| ID | Recommendation | Applied in repo? | Ranking response |
|---|---|---|---|
| SEO-CTR-001 | Homepage `seoTitle` = « Cours de couture à Revel et Verdalle, près de Castres » | **Yes**, re-confirmed this run both in `src/content/pages/homepage/index.yaml` and live via `curl` — exact match | GSC still unchanged (too early). Google's live Castres/Revel organic snippets keep showing the new title, as they did in the prior follow-up. |
| SEO-STRIKE-002 | Proximity-to-Castres language in homepage `seoDescription` | **Yes**, re-confirmed in Keystatic source and live `curl` | Same — not yet in GSC, live snippet unchanged from the prior confirmation. |
| SEO-CTR-003 | Trousse tutorial: H2 matching striking-distance queries + "20 cm" in title | **Yes**, re-confirmed: `src/content/blog/coudre-trousse-fermeture-eclair/index.mdoc` still has the retitled `title` and the `## Étape 2 : comment poser la fermeture éclair sur une trousse ?` heading | Too early to measure (same GSC snapshot as the last two runs). |
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) / Revel benchmark (6–31) | Owner action, outside repo | **Still 6 reviews** in both Castres and Revel packs. No progress since the baseline. This is now the most stagnant open item across four same-day runs and the one lever most likely to move rankings — the on-page fixes are live and indexed, so the remaining gap versus the Castres top-3 is largely a review-volume gap, not a content gap. |

## 4. This run's improvements

No new content changes. Every on-page fix from the baseline and first follow-up is confirmed still live and correctly indexed (Google's own snippets reflect it). There is no fresh ranking or CTR signal yet to act on — GSC needs real elapsed time, not more same-day re-pulls, before another content change would be evidence-driven rather than guesswork.

## 5. Content-gap discovery (Step 7) — methodology retry

Last run flagged that `keyword_ideas` seeded with `["machine a coudre", "debuter couture", "surjeteuse"]` returned 100 items dominated by unrelated high-volume noise, and proposed retrying with `closely_variants: true`. This run did that, plus one diagnostic follow-up:

- **Retry with `closely_variants: true`, same 3 seeds**: still broken. Of 100 returned items, only 2 were sewing-related at all (`couture`, `couture autour de moi` — both already-tracked terms, not new gaps). The top of the list was still generic noise (`livret a`, `machine a laver`, `manege a bijoux`...). **The flag did not fix it.**
- **Diagnostic: single clean seed (`surjeteuse` alone)**: this *did* return genuinely on-topic results (`surjeteuse elna`, `biais surjeteuse`, `decoudre surjeteuse`, `notice surjeteuse qilive`...) — confirming the root cause is **mixing multiple seed phrases in one call**, not the `closely_variants` flag. But these single-seed results are thin: max volume 170, most 0–30 or null, and mostly brand/model/troubleshooting intent (an overlocker's brand name, a retailer's SKU) rather than instructional content a blog post could credibly rank for.
- **Competitor gap, rotating Labs call (this run's turn: atelierdecouture.fr, the strongest roster domain)**: `ranked_keywords` returned only 7 keywords total, all either branded (« atelier d'elise... », « lise retouches ») or geographically out of catchment (Toulouse, Castelnau-le-lez — ~90 min from Verdalle). No usable gap.

**No `SEO-NEW` suggestion this run** — per the skill's own rule, no suggestion is better than a weak one, and neither hunting ground produced a keyword with both real volume and a plausible page-1 path.

**Methodology note for next run**: don't combine multiple seed terms in one `keyword_ideas` call — issue one call per distinct seed (`machine à coudre`, `débuter couture`, `surjeteuse` separately) so each stays on-topic, and consider `dataforseo_labs/google/related_keywords/live` instead of `keyword_ideas` for single-seed semantic expansion, since `keyword_ideas`'s clustering appears to broaden category scope whenever the seed list itself is heterogeneous.

## 6. Blockers and data caveats

- Same as the last two runs: this is an out-of-cycle same-day firing (four runs today), still inside GSC's ~2–3 day reporting lag. GSC data will not show real signal until enough calendar time has passed since the baseline deploy (20:30 UTC).
- Local-pack rank comparisons in §2 mix two SERP methodologies: the 2026-07-13 baseline competitor sweep used `location_name: France` (per the skill's own noted caveat at the time), while this run and both prior follow-ups use per-town geolocation (`Castres,Occitanie,France` / `Revel,Occitanie,France`), which the skill recommends as the more accurate method for local queries. The Castres GBP-pack reorder (La Fée Dymotite vs. Déco Couture) is reported against the France-wide baseline and should be read with that caveat — it is not a clean apples-to-apples delta. The Revel-vs-Revel and Castres-vs-Castres deltas against the prior two follow-up runs (same geolocated method) are clean.
- The other 9 catchment-town keywords from the baseline sweep were deliberately not re-pulled this run to keep spend proportionate to a routine run; `competitors.csv` here only contains rows for the two keywords actually re-measured (Castres, Revel). The rest of the roster's last-known values remain in `2026-07-13-competitor-sweep/competitors.csv`.
- DataForSEO spend this run: 2 live SERP calls (Castres + Revel, depth 20, $0.008) + 3 Labs calls (`ranked_keywords` for atelierdecouture.fr $0.01284, `keyword_ideas` multi-seed retry $0.024, `keyword_ideas` single-seed diagnostic $0.01548) ≈ **$0.060**. This is at the skill's 3-Labs-calls-per-run cap for step 7 (the rotating competitor call plus two keyword_ideas attempts).
- Raw API responses preserved in `raw/` for auditability.

*Next run: this should ideally be the actual next scheduled biweekly firing with real calendar time elapsed. Check (a) whether SEO-CTR-001/002/003 have finally moved GSC position/CTR now that the re-crawl has been confirmed live for two consecutive runs, (b) whether GBP reviews have grown at all (still the single biggest lever, unmoved across four runs), (c) the Castres La Fée Dymotite/Déco Couture pack-order swap — confirm with another geolocated pull whether it's stable or one-off volatility, and (d) try the `related_keywords` endpoint with single seeds for the content-gap step per the methodology note in §5.*
