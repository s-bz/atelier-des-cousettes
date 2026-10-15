# SEO Improver — Scheduled run, 2026-10-15

Property `sc-domain:atelier-des-cousettes.fr` · GSC query snapshot pulled 2026-10-15 (rolling 28-day window, `startDate=2026-09-17`/`endDate=2026-10-13`) · prior window for deltas: `startDate=2026-08-20`/`endDate=2026-09-16` (a clean, non-overlapping 28-day period — the first genuinely clean two-week-class diff since the domain migration, as the 2026-08-26 run hoped for) · baseline for narrative comparison: `reports/seo-improver/2026-08-26/report.md` · SERP checks: fresh geolocated pulls for Castres and Revel via DataForSEO, plus one diagnostic pull for a decayed query.

This is the first run in six weeks (last run 2026-08-26) — no `2026-09-XX` runs landed in the repo, so this is effectively catching up seven weeks of movement in one diff. Treat the magnitude of changes below as cumulative over that span, not a single fortnight.

## 1. Executive summary

**The single most important action this run is still SEO-DECAY-006 — the consolidate-vs-expand decision on three thin beginner posts has been pending since 2026-07-15 (eight consecutive runs) and just got worse, not better.** `debuter-couture-conseils` regressed again this run, from `Discovered - currently not indexed` to `URL is unknown to Google` — Google has now fully lost its record of ever crawling this page. The other two (`choisir-machine-a-coudre`, `trousse-couture-indispensables`) are flat at `Discovered - currently not indexed`. Eight runs of carrying this forward unresolved is no longer "awaiting a decision" — it reads as decided-by-neglect, and the neglect is actively costing index presence. This run does not force a default (no auto-consolidation without authorization, per the skill's own rule), but the next run should treat "still no decision" as itself requiring an explicit call, not another carry-forward.

**Genuinely good news, confirmed now that a clean window exists:** the domain migration and the last two runs' CTR fixes are working.
- The two canonical-mismatch pages flagged 2026-08-26 (`la-couturiere`, `blog/entretenir-machine-a-coudre`) are now both `Submitted and indexed` with the correct `atelier-des-cousettes.fr` canonical — fixed.
- `couture-tarn.fr` (the old domain) still exists as a separate Search Console property and still gets *some* fresh impressions, but they collapsed from **297 to 50** (−83%) over the same two windows — the migration is consolidating, just not finished. One stale artifact remains: `blog/coudre-ourlet-invisible` is still marked `Duplicate, Google chose different canonical than user` with a last crawl from 2026-08-18, even though `googleCanonical` now correctly matches `userCanonical` — the verdict just hasn't been refreshed since. `referringUrls` on that inspection still lists `https://couture-tarn.fr/blog/coudre-ourlet-invisible/`, confirmed still 301-redirecting correctly. **Owner action**: request indexing on that URL to force a re-verdict.
- The branded query cluster ("l'atelier des cousettes" / "atelier des cousettes") that was split and weak in the 2026-08-26 report (21 impressions, 0 clicks, split pos 6.1/10.5) is now strong and consolidating onto the homepage: **92 impressions, 21 clicks, 22.8% CTR**, homepage position **2.4–3.6**. `/ateliers-reguliers/` still picks up a meaningful slice (35 impressions, pos ~8.4) — residual mild cannibalization, much reduced but not gone.
- Homepage overall: CTR **4.8% → 8.2%**, average position **6.7 → 5.4**, clicks **18 → 29** on slightly fewer impressions. This is the first clean, isolable read on `SEO-CTR-001` (the homepage `seoTitle` rewrite) and it's a clear win.
- `cours de couture revel` now ranks **organic position 2** for `atelier-des-cousettes.fr` (previously the site had no organic presence there at all, only a local-pack slot sliding 7→8→9). That's new territory, not incremental.

**New decay worth flagging, not fixing:** `couturiere castres` (390 vol) fell from GSC position 2.9 to 8.1 (impressions 15→8), and a fresh live SERP for the exact phrase shows `atelier-des-cousettes.fr` absent entirely from both organic and the local pack through depth 22. What now occupies that pack reads as alteration/repair services (Ev'lyn Couture & Retouches, Déco Couture, L'Atelier de Josie) rather than sewing-class providers — "couturière" read literally skews toward "seamstress for repairs," which isn't this business's offering. This looks like an intent-matching correction, not a fixable ranking loss — same category as the `cousette` non-opportunity from the last run. No action recommended.

**Two Keystatic content fixes applied this run** (`SEO-CTR-008`, `SEO-CTR-009`, §4).

## 2. Movement since last run

Site-wide (primary domain, clean 28-day windows): impressions **810 → 1,395** (+72%), clicks **29 → 53** (+83%). Full keyword table in `rankings.csv`.

- **Branded cluster — resolved from "split and weak" to "consolidating and strong."** See §1. The homepage now wins the branded query outright; `/ateliers-reguliers/` is a shrinking secondary claimant, not a tie.
- **`cousette` — still a false opportunity, now even less worth chasing.** 83 impressions, position 4.6 (up from 6.3), still 0% CTR. Same diagnosis as 2026-08-26: `cousette.com` and dictionary results own the intent; not re-verified via fresh SERP this run since nothing changed, but GSC's own numbers are consistent with "no customer intent here regardless of position."
- **`couturiere castres` — new decay, diagnosed as intent mismatch, not actionable.** See §1.
- **`atelier de couture` — strong real gain.** Position 14.2 → 5.2 (+9.0), 3,600 monthly volume. This is now genuinely striking-distance-adjacent and worth a future on-page push once `SEO-DECAY-006` is off the table.
- **`cours de couture` (2,900 vol) — gained.** 10.7 → 6.5.
- **`cours de couture castres` — holds.** Position 4.0 → 3.3, 46.7% CTR (7 clicks/15 impressions) — still the strongest local query in the set.
- **Local packs (fresh DataForSEO pulls, Castres + Revel, depth 20):**
  - **Castres — L'Atelier des Cousettes rank 7 → 6**, reviews **6 → 7** (first review gained in at least nine tracked runs). Déco Couture took the #1 slot (was #2), reviews 20 → 21. La Fée Dymotite's reviews jumped the most (23 → 26, +3) but its local-pack position fell from #1 to #5 in this pull — read that position swing cautiously: the Castres pack rendered differently this time (Mercerie Floriane, previously a fixture at #6 with 158 reviews, didn't appear in the pack at all this pull, only in plain organic at rank 21), so some of this is SERP-rendering volatility rather than a clean apples-to-apples rank comparison. The review-count trend (us +1, Déco Couture +1, La Fée Dymotite +3) is the more reliable signal: `SEO-GBP-004`'s gap is still widening, just more slowly than when we were flat at 6 for nine runs straight.
  - **Revel — no local pack rendered this pull at all.** The SERP instead returned a Knowledge Graph panel for **Créa'Isi** (32 reviews, up from 31) plus a `google_reviews` block for the same entity — i.e. Google is now treating Créa'Isi as knowledge-panel-worthy for this query, a stronger SERP position than a local-pack slot. Atelier Artéli appears in plain organic at rank 6 (no rating data available in that format). Because no local pack rendered, we cannot directly compare our own Revel GBP rank or Atelier Artéli's review count to the 7→8→9 slide tracked in prior runs — flagged as a data gap, re-check next run rather than treating the pack's absence as a ranking loss.
  - `latelierdescousettes.fr` (name-collision) and `couture-tarn.fr` (old domain): absent from both fresh pulls — no action, keep watching.
  - `atelierdecouture.fr`: absent from both pulls again (was rank 21–22 in Revel previously) — consistent with being an out-of-catchment competitor with no real local footprint here.

## 3. Did last run's changes work

| ID | Recommendation | Applied? | Ranking response |
|---|---|---|---|
| SEO-CTR-001 | Homepage `seoTitle` = « Cours de couture à Revel » (+ Verdalle/Castres framing) | Yes, live | **Confirmed working**, first clean read: CTR 4.8% → 8.2%, avg position 6.7 → 5.4, clicks 18 → 29. |
| SEO-CTR-007 | Trousse tutorial `seoTitle` tightened to match "trousse fermeture éclair 20 cm" literally | Yes, live | Page total: impressions 156 → 219, clicks 8 → 12, CTR 5.1% → 5.5%. Target query itself: position 7.8 → 6.0 holding ~10.8% CTR (already well above the ~5–7% expected at that position, both before and after) — the title match likely helped sustain high CTR through a position change, though the signal is intertwined with the page's broader growth (a new top query, "tuto pochette avec fermeture éclair 20 cm," emerged with 62 impressions this window). |
| SEO-COVERAGE-005a | Internal link `idees-cadeaux-couture-faits-main` → `couture-enfants-projets-faciles` | Yes, live | **Recovered**: now `Submitted and indexed` (was `Discovered - currently not indexed`). |
| SEO-COVERAGE-005b | Internal link `coudre-tote-bag` → `coutures-de-base` | Yes, live | **Recovered**: `coutures-de-base` is now `Submitted and indexed` (had regressed to `URL is unknown to Google` last run). |
| SEO-DECAY-006 | Consolidate-vs-expand call on 3 thin posts — awaiting user decision | Not applied (still awaiting the user) | **Regressed further**: `debuter-couture-conseils` went `Discovered - currently not indexed` → `URL is unknown to Google`. The other two unchanged at `Discovered`. Eight runs pending — see §1. |
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | Owner action, outside repo | **First movement**: Castres reviews 6 → 7. Still behind Déco Couture (21) and La Fée Dymotite (26), both of which also gained, so the absolute gap hasn't closed — but the multi-run flat line is broken. |

## 4. This run's improvements

**SEO-CTR-008 — applied.** `src/content/blog/couture-enfants-projets-faciles/index.mdoc`: added `seoTitle: 'Idées activités couture enfant : projets faciles'` (no `seoTitle` existed before; the `<title>` tag fell back to the page `title`, "Couture pour enfants : 8 projets faciles et ludiques"). This page is the top-ranking result for a cluster of near-zero-CTR queries this run: "activité couture enfant 6 ans" (63 impressions, position 10.3, **0 clicks**), "idée couture pour petite fille" (21 impressions, position 9.8, **0 clicks**), "couture facile enfant" (23 impressions, position 8.8, 1 click). Combined, that's ~107 impressions and 1 click across three queries at positions where 2–5% CTR would be the baseline expectation. The new title surfaces "activités," "idées," and "enfant" together — the literal terms across all three queries — rather than only "projets faciles." Expect the effect to show in the next run's GSC pull.

**SEO-CTR-009 — applied.** `src/content/blog/coutures-de-base/index.mdoc`: added `seoTitle: 'Types de couture : anglaise vs rabattue, guide complet'` (again, no prior `seoTitle`; fallback title was "Les différentes coutures de base en couture," which repeats "couture" awkwardly and doesn't literally contain "type de couture" or name the two techniques). Target queries: "type de couture" (38 impressions, position 9.2, 0 clicks) and "différence entre couture anglaise et couture rabattue" (29 impressions, position 9.3, 0 clicks) — 67 impressions combined, zero clicks. The new title echoes "type de couture" near-verbatim and names "anglaise"/"rabattue" directly, which the FAQ on this page already answers in detail.

### 4a. Index coverage audit (skill step 6a)

Ran `gsc.mjs inspect` on all 83 sitemap URLs (parallelized, 8 concurrent; sitemap shrank from 85 to 83 — two URLs dropped, not investigated further this run):

| Coverage state | This run | 2026-08-26 |
|---|---|---|
| Submitted and indexed | **36** | 21 |
| Discovered - currently not indexed | **26** | 44 |
| URL is unknown to Google | **20** | 18 |
| Duplicate, Google chose different canonical than user | **1** | 2 |

Net: indexed count up 71%, the "Discovered" backlog shrank by 18. "Unknown to Google" ticked up by 2 — worth a closer look, but most of that bucket is still the 2026-08-03 glossary/blog batch (now ~10 weeks old) working through crawl budget on a small site, not a new regression:

- **`/conditions/` — fixed, now `Submitted and indexed`** (was `URL is unknown to Google`; the 2026-08-26 report's "Request indexing" recommendation for this page appears to have worked, or it simply got crawled in the normal course).
- **`/contact/` — partial progress.** Moved from `URL is unknown to Google` to `Discovered - currently not indexed` — Google now has a record of it but hasn't indexed it. Still linked from the header/footer on every page, so this isn't a linking gap. **Owner action, unchanged**: hit "Request indexing" in the GSC UI.
- **`la-couturiere` and `blog/entretenir-machine-a-coudre` — fully resolved.** Both `Submitted and indexed`, canonical now correctly self-referential. See §1.
- **`blog/coudre-ourlet-invisible` — stale duplicate verdict.** See §1; recommend "Request indexing" to force a fresh crawl now that the canonical fields already agree.
- **`SEO-DECAY-006` posts — see §3, one got worse.**
- A cluster of glossary terms (`boutonniere`, `canette`, `couture-rabattue`, `embu`, `fronces`, `griffes-d-entrainement`, `lisiere`, `marge-de-couture`, `molleton`, `ourlet`, `parementure`, `point-d-arret`, `popeline`, `surfilage`, `surpiqure`) and a handful of stage pages (`stage-sac-et-tote-bag`, `stage-trousse`) and blog posts (`debuter-couture-conseils`, `points-couture-main-essentiels`, `retouches-simples-ourlet-bouton-fermeture`) are `URL is unknown to Google`. These are overwhelmingly part of the same 2026-08-03 bulk-content push; `/stages-thematiques/initiation-machine-a-coudre/`, `/reserver/retour/`, `/ateliers-reguliers/inscription/` etc. carry intentional `noIndex` and are excluded from concern (confirmed in page source, as last run noted). Nothing here looks like a new, distinct problem — it reads as the same crawl-budget dilution still working itself out, now trending toward resolution rather than away from it (unlike `SEO-DECAY-006`, which is the one bucket moving the wrong direction).

### 4b. Competitor Labs rotation (steps 6b/7)

This run's turn: **`lacouzeuse.org`** (`ranked_keywords`, France). Result: essentially empty — the bare domain returned exactly one keyword ("furieuse company," 70 vol, unrelated), and a `www.lacouzeuse.org` variant check returned zero keywords. DataForSEO's organic-keyword index appears to have almost no visibility into this domain at all. No usable gap — the fifth roster domain in a row (after `atelierdecouture.fr` and others) to yield nothing. **Next run's rotation: `acde-couture.fr`** (remaining after this: `atelieraslena.fr`, `latelierdesgourdes.fr`).

### 4c. Content-gap discovery (step 7)

`keyword_ideas` seeded from `surjeteuse`, `trousse fermeture éclair`, `couture enfant`, `type de couture` (updated seed set — swapped out `machine à coudre`/`débuter en couture`, which produced only retailer/brand noise last run, for the two clusters that are demonstrably earning impressions this run). Result was dominated by near-total semantic drift: unit conversions (`pouce en cm`, 74,000 vol), scrap-metal and commodity prices (`prix ferraille`, `prix canadair`, `prix eurasier`), and other keyword-ideas noise entirely unrelated to sewing. Only two results were on-topic — `pfaff surjeteuse` (210 vol) and `surfileuse ou surjeteuse` (70 vol) — both already-known terms, no new gap. Nothing cleared the bar for a `SEO-NEW` suggestion.

## 5. New content suggestions

None this run — see §4c.

## 6. Blockers and data caveats

- No blockers: GSC and DataForSEO credentials both worked throughout.
- This run spans seven weeks of actual elapsed time (last run 2026-08-26) even though the GSC windows compared are a clean, non-overlapping 28-day pair — read the magnitude of movement as cumulative, not a two-week swing.
- The Revel local pack did not render in this run's SERP pull (replaced by a Créa'Isi knowledge panel) — our own Revel GBP rank and Atelier Artéli's current review count are both unavailable this run; re-check next run.
- The Castres local pack's composition shifted (Mercerie Floriane absent this pull, present last run) — treat position deltas there as somewhat noisy; the review-count deltas are the steadier signal.
- DataForSEO spend this run: 3 live SERP calls (Castres + Revel local/organic, depth 20; one diagnostic pull for "couturiere castres," depth 15) ≈ $0.006, + 3 Labs calls (`ranked_keywords` for `lacouzeuse.org` bare and `www.` variant ≈ $0.10 each, `keyword_ideas` 4-seed ≈ $0.02) ≈ $0.22. Total ≈ **$0.226**, at the 3-Labs-call cap (two of those three were spent confirming the same near-empty result for one domain — next run should trust a single bare-domain lookup rather than also checking a `www.` variant).
- Raw `gsc.mjs inspect` results (all 83 URLs), both GSC query pulls (current + prior window, plus `couture-tarn.fr`'s equivalent), and all DataForSEO responses are saved under `raw/` for auditability.

*Next run should: (a) push hard for the `SEO-DECAY-006` decision — eight runs pending and now actively regressing, this is the top item; (b) confirm `/contact/` and `blog/coudre-ourlet-invisible` moved after "Request indexing"; (c) re-check whether the Revel local pack renders normally again and reconfirm our GBP rank there; (d) reconfirm the Castres local-pack composition (was Mercerie Floriane's absence a one-off?) and keep tracking `SEO-GBP-004`'s review-count gap now that it's moving on both sides; (e) rotate the competitor Labs call to `acde-couture.fr`; (f) watch whether `couturiere castres`'s intent-mismatch read holds (i.e. confirm no further erosion of "cours de couture castres," which is the business's actual offering); (g) revisit `atelier de couture` (3,600 vol, now position 5.2) as a near-term striking-distance push once `SEO-DECAY-006` is resolved.*
