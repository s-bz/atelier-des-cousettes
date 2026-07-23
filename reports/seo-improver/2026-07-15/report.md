# SEO Improver — Scheduled run, 2026-07-15

Property `sc-domain:couture-tarn.fr` · GSC query snapshot pulled 2026-07-15 (rolling 28-day window, `startDate=2026-06-15`/`endDate=2026-07-13` — the script always ends 2 days back to avoid GSC's reporting lag) · baseline for this run: `reports/seo-improver/2026-07-13-scheduled-2/report.md` (PR [#82](https://github.com/s-bz/atelier-des-cousettes/pull/82), the most recent of six same-day runs on 2026-07-13) · SERP checks: fresh geolocated pulls for Castres and Revel via DataForSEO.

This is the **first run that fires on a genuinely different calendar day** from the six 2026-07-13 runs. GSC's own reporting lag (~2–3 days) still has not fully cleared the 2026-07-13 20:30 UTC deploy — the query window's `endDate` is still 2026-07-13 — but the rolling window itself has moved forward two days for the first time, so this run's numbers are real (not a byte-identical repeat), even if the deploy's effect isn't isolable yet.

## 1. Executive summary

**No ranking or CTR signal attributable to the 2026-07-13 fixes (SEO-CTR-001/002/003) exists yet** — expected, since the GSC window still barely touches the deploy date and averages it against 26 days of pre-change data. All 18 tracked keywords moved by less than half a position except two low-impression queries (`cours de couture` +0.5, `couturière indépendante` +1.4), consistent with rolling-window noise, not a real signal either way.

The one finding that **is** real and actionable this run: **our Google Business Profile has fallen completely out of the Castres local pack** (was rank 8/9 as of the last check; a fresh 9-listing pull today doesn't include us at all — replaced by six other local businesses, none on the tracked competitor roster). Revel is unchanged (rank 7/9, still 6 reviews). Review counts are unchanged everywhere. This sharpens `SEO-GBP-004`, now stagnant for a seventh consecutive run and newly worse in Castres specifically — see §2.

Index coverage (§4a): one of the six previously-flagged blog posts progressed from "URL is unknown to Google" to "Discovered — currently not indexed" (`couture-enfants-projets-faciles`) — the first sign of any crawl-state movement since PR #81's linking fix landed. The other five are unchanged. A new post, `choisir-fil-aiguille` (published 15 days ago, just past the normal-lag window), is now flagged as "URL is unknown to Google" for the first time, but it already carries 2 inbound contextual links and 1,060 words, so this reads as ordinary crawl-budget timing on a small site rather than a linking or thin-content problem — tracked as a watch item, not acted on.

**No Keystatic edits this run.** Nothing surfaced with strong enough evidence: the GSC data is too fresh/noisy to justify new title or meta changes, the GBP drop is outside the repo, and the standing thin-content question (`SEO-DECAY-006`) is still a strategy call waiting on the user.

## 2. Movement since last run

**GSC (tracked keywords)**: all 18 rows in `rankings.csv` moved by ≤0.2 positions except two: `cours de couture` (10.2 → 9.7) and `couturière indépendante` (8.1 → 6.7), both on single-digit impression counts — not distinguishable from noise. No keyword gained/lost enough impressions to flag. Two new long-tail queries appeared with 1 impression each (`comment faire un ourlet invisible`, `cours particuliers`) — too thin to add to the tracked set. Five near-zero-impression queries present in the last pull no longer appear (`couturières à proximité`, `outure`, `couturiste`, `atelier de la creation`, `couturerie`) — all 1–3 impressions each, ordinary long-tail churn in a 28-day rolling window, not a real loss.

**Local packs (fresh DataForSEO pulls, Castres + Revel, depth 20)**:
- **Castres — regression.** L'Atelier des Cousettes is **no longer in the 9-listing local pack** (was rank 8/9 in the 2026-07-13-scheduled-2 pull). The pack is now: La Fée Dymotite (#1, 23 reviews, unchanged), Déco Couture (#2, 20 reviews, unchanged), then four non-roster businesses not seen in prior pulls (L'Atelier de Josie, Point ZIG ZAG, Création L.A.K, Mercerie Floriane) plus Ev'lyn Couture & Retouches and Hera Création. Organic: we also don't appear in the top 20 organic results for "cours de couture castres" (consistent with prior runs — this exact phrase has never returned GSC impressions either).
- **Revel — unchanged.** L'Atelier des Cousettes still rank 7/9 in the local pack, 5.0★/6 reviews. Organic: still #1 for "cours de couture revel" (`rank_group=1`), matching every prior pull.
- **Competitor movement**: `atelierarteli.fr` slipped one organic spot in Revel (5 → 6); their GBP listing also slipped one local-pack spot (8 → 9). `atelierdecouture.fr` (the strongest roster competitor) now appears at organic rank 14 in the Revel pull — first time it's been captured in a Revel-specific SERP check. `latelierdescousettes.fr` (name-collision watch) still organic rank 13 in Revel, no local-pack presence. Nothing here suggests a competitor caused the Castres local-pack drop; it reads as GBP ranking volatility (proximity/freshness signals), not a competitor overtaking us.
- Full detail in `competitors.csv`.

## 3. Did last run's changes work

| ID | Recommendation | Applied in repo? | Ranking response |
|---|---|---|---|
| SEO-CTR-001 | Homepage `seoTitle` = « Cours de couture à Revel et Verdalle, près de Castres » | Yes, still live (re-confirmed via `curl`) | Too early — GSC window still barely reaches the deploy date. Homepage overall CTR is 0.9% over 429 impressions this window (blended pre/post-change), not yet meaningful as a post-change measurement. |
| SEO-STRIKE-002 | Proximity-to-Castres language in homepage `seoDescription` | Yes, still live | Same — no isolable signal yet. |
| SEO-CTR-003 | Trousse tutorial retitled + new H2 | Yes, still live | Too early; page holds position 8.9 (unchanged) with 50 impressions / 0 clicks this window — worth a hard look next run once the window fully post-dates the change, but not yet a verdict. |
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | Owner action, outside repo | **Still 6 reviews** everywhere, unchanged for the seventh consecutive run — and Castres got *worse* (dropped out of the local pack entirely, see §2). This is now the single most urgent open item; on-page/content work is essentially exhausted as a lever until review volume moves. |
| SEO-COVERAGE-005a/b | Two contextual internal links added (`idees-cadeaux-couture-faits-main` → `couture-enfants-projets-faciles`; `coudre-tote-bag` → `coutures-de-base`) | Yes, still live | `couture-enfants-projets-faciles` progressed from "URL is unknown to Google" to "Discovered - currently not indexed" — the first crawl-state movement since the fix. `coutures-de-base` (linked from `coudre-tote-bag`) is unchanged, still "Discovered - currently not indexed". Both still need a full index decision from Google; tracked further in §4a. |
| SEO-DECAY-006 | Consolidate (or expand) the three thin beginner posts (`debuter-couture-conseils`, `trousse-couture-indispensables`, `choisir-machine-a-coudre`) | Not applied — awaiting a user decision per the prior run's recommendation | All three still "Crawled - currently not indexed", `lastCrawlTime` unchanged since the last check (Google hasn't re-crawled any of them yet despite the linking fix being live for days now). Two days is still short for a re-crawl on a low-authority site; not yet strong enough evidence either way, but the clock is the same one the prior run flagged — worth revisiting again next run. |

## 4. This run's improvements

### 4a. Index coverage audit (skill step 6a) — now a standing part of every run

Sitemap grew from 29 to 30 URLs (`points-couture-main-essentiels`, publish-dated 2026-07-14, is now live and correctly included). Ran `gsc.mjs inspect` on all 30 in parallel.

**20 of 30 are `Submitted and indexed`**, 1 (`mentions-legales`) is correctly `Excluded by 'noindex' tag`. **9 have a coverage state worth looking at**:

| Page | Coverage state | Age | Flag? |
|---|---|---|---|
| `choisir-machine-a-coudre` | Crawled - currently not indexed | ~4 months | Yes — unchanged, tracked under SEO-DECAY-006 |
| `debuter-couture-conseils` | Crawled - currently not indexed | ~3 months | Yes — unchanged, tracked under SEO-DECAY-006 |
| `trousse-couture-indispensables` | Crawled - currently not indexed | ~5 months | Yes — unchanged, tracked under SEO-DECAY-006 |
| `coutures-de-base` | Discovered - currently not indexed | ~52 days | Yes — unchanged |
| `couture-zero-dechet-projets-pratiques` | Discovered - currently not indexed | ~29 days | Yes — unchanged |
| `couture-enfants-projets-faciles` | Discovered - currently not indexed | ~43 days | Yes — **improved** from "unknown" last run |
| `choisir-fil-aiguille` | URL is unknown to Google | 15 days | New flag, but well-linked (2 inbound contextual links + blog index) and not thin (1,060 words) — watch, no action |
| `couture-ete-accessoires-vacances` | URL is unknown to Google | 8 days | No — normal lag |
| `points-couture-main-essentiels` | URL is unknown to Google | 1 day | No — normal lag |

**Owner action, unchanged from last run**: for the six older flagged posts, use « Request indexing » in the GSC UI — the API still doesn't expose this. No new owner action needed for `choisir-fil-aiguille` yet; if it's still unknown to Google after another ~1–2 weeks, add it to the request-indexing list too.

**No new internal links added this run.** Both posts targeted by last run's `SEO-COVERAGE-005a/b` links are still solidly linked; the three `SEO-DECAY-006` posts already have adequate linking per the prior run's audit (2–5 inbound links each) — their block is a content-quality/consolidation question, not a linking gap, and that decision is still pending from the user.

### 4b. Competitor Labs rotation (steps 6b/7)

This run's turn: `atelierarteli.fr` (`ranked_keywords`, France, limit 50). **Zero ranked keywords returned** (`items_count: 0`) — same dead end the prior run already found for this domain via a different signal (present in the Revel local pack and organic SERP, but absent from DataForSEO's Labs index entirely). No usable competitive signal. **Next run's rotation: `atelierdecouture.fr`** — the strongest roster competitor, not yet pulled via Labs (only ever seen in live SERP checks), and the two lower-tier domains tried so far (`cameleoncouturecreation.com`, `atelierarteli.fr`) have both come back empty.

### 4c. Content-gap discovery (step 7)

Retried `related_keywords` with single seeds per the prior run's methodology note. Both came back 100% on-topic (no retail noise this time):
- `ourlet` → `ourlet pantalon` (vol 5,400), `ourlet couture` (vol 110), `ourlet robe` (vol 210), others under 200.
- `patron couture` → `patron couture gratuit` (vol 6,600), `patron couture facile gratuit à télécharger` (vol 1,600), `patron couture femme` (vol 880), others under 500.

Checked both against GSC: the site currently earns **zero impressions** for any `patron` query and only 2 impressions total across two `ourlet` variants. Neither cluster clears the bar for a `SEO-NEW` suggestion this run: `patron couture gratuit` is a huge-volume but nationally competitive resource-roundup intent (download sites, not lesson providers) with no plausible page-1 path for a small local business page; the `ourlet` terms are real but modest, and the existing `retouches-simples-ourlet-bouton-fermeture` post already covers the topic without a specific ranking or content gap to point at. Per the skill's own rule, no suggestion is better than a weak one — skipping `SEO-NEW` this run.

## 5. New content suggestions

None this run — see §4c for why.

## 6. Blockers and data caveats

- GSC's ~2–3 day reporting lag still has not fully cleared the 2026-07-13 20:30 UTC deploy; this run's window barely touches it. The next run should be the first with a clean pre/post comparison.
- DataForSEO spend this run: 2 live SERP calls (Castres + Revel, depth 20, ~$0.008) + 3 Labs calls (`ranked_keywords` for `atelierarteli.fr` $0.012, `related_keywords` × 2 for `ourlet` and `patron couture` ≈ $0.026) ≈ **$0.046**, at the 3-Labs-call cap.
- The Castres local-pack drop-out (§2) is measured from a single fresh pull each side (2026-07-13 vs 2026-07-15) — local packs can be volatile query-to-query; worth reconfirming next run before treating it as a settled trend, though it's consistent with the review-count stagnation story either way.
- Raw API responses and all 30 `gsc.mjs inspect` results preserved under `raw/` for auditability.

*Next run: (a) first clean pre/post-deploy comparison for SEO-CTR-001/002/003 should be possible; (b) reconfirm the Castres local-pack drop-out with a second pull; (c) rotate the competitor Labs call to `atelierdecouture.fr`; (d) re-check whether any of the three `SEO-DECAY-006` posts flipped to indexed, and get the user's consolidate-vs-expand decision if still not; (e) `SEO-GBP-004` — seventh run stagnant, still the single biggest lever, now worse in Castres specifically.*
