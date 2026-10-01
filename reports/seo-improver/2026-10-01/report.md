# SEO Improver — Scheduled run, 2026-10-01

Property `sc-domain:atelier-des-cousettes.fr` · GSC query snapshot: current window `startDate=2026-08-31`/`endDate=2026-09-28`, compared against the adjacent prior window `startDate=2026-08-03`/`endDate=2026-08-30` — the first genuinely clean, non-overlapping two-window diff since the domain migration (previous run's window still spanned the migration itself). Baseline for recommendation tracking: `reports/seo-improver/2026-08-26/`. SERP checks: fresh DataForSEO pulls for Castres and Revel (organic + local pack), plus four informational-query pulls (`cranter def`, `encolure`, `patron couture definition`, `type de couture`) to diagnose a recurring 0%-CTR pattern. Index coverage: `gsc.mjs inspect` on all 82 sitemap URLs.

## 1. Executive summary

**The domain migration mess from the last run is now largely resolved.** Both canonical-mismatch pages flagged 2026-08-26 — `la-couturiere` and `blog/entretenir-machine-a-coudre` — now show `googleCanonical === userCanonical` pointing at `atelier-des-cousettes.fr` and coverage state `Submitted and indexed`. `/conditions/` flipped from `URL is unknown to Google` to `Submitted and indexed`. `/contact/` moved from `unknown` to `Discovered - currently not indexed` (progress, but still needs a nudge — see §4a). This wasn't a repo change; either the owner ran the GSC "Change of Address" tool or Google finished reconciling on its own. Either way, the branded query `atelier des cousettes` (unaccented) is now cleanly consolidated on the homepage (pos 4.8, 23 impressions, 21.7% CTR) instead of split across two pages. The accented `l'atelier des cousettes` variant still splits homepage (pos 2.5, excellent 61% CTR on 13 impr) vs. `/ateliers-reguliers/` (pos 8.5, weak 4% CTR on 24 impr) — improved from last run's 6.1/10.5 split but not fully healed. Low volume; not chasing it with a title change that would risk `/ateliers-reguliers/`'s own good rankings.

**Index coverage improved substantially**: 32 of 82 URLs now `Submitted and indexed` (was 21/85). `SEO-COVERAGE-005a` and `005b` (internal links added 2026-08-26) both paid off: `coudre-tote-bag` and `idees-cadeaux-couture-faits-main` are now indexed, and `coudre-tote-bag` already shows real impressions (59/28d, 1 click) it didn't have before. See §3.

**`SEO-CTR-007` worked.** The trousse tutorial's `seoTitle` fix (matching the literal "(20 cm)" into the `<title>` tag) moved "trousse fermeture éclair 20 cm" from pos 10.9/2.9% CTR to pos 7.1/**18.5% CTR**, and the page's broader keyword set jumped hard: "tuto trousse avec fermeture éclair 20 cm" pos 12.8→4.5 (8.1% CTR), "tuto trousse facile avec fermeture éclair" pos 27.9→12.7 (20% CTR). This is the single clearest win of the run.

**`cours de couture castres` is now a genuine top-3 local ranking** (pos 2.6, up from 7.4, 26.9% CTR) — but a live SERP check shows the Castres **local pack itself has compressed to 3 visible results** (down from the ~12 Google showed in prior checks), and L'Atelier des Cousettes — along with Mercerie Floriane and several other roster names — no longer appears in it at all. Re-ran the pull twice to rule out a fluke; the 3-pack held both times. This looks like a genuine SERP-feature change for this query/location, not a ranking loss we caused — but it means Google Business Profile visibility for "cours de couture castres" is now entirely gated on being one of 3 shown names, which raises the stakes on `SEO-GBP-004` (reviews). See §2 and §4a.

**One new content fix applied** (`SEO-CTR-008`, §4): added "(ou pochette)" to the trousse tutorial's intro, since "tuto pochette avec fermeture éclair 20 cm" / "tuto pochette fermeture éclair 20 cm" together pull 61 impressions on that page but only 1 click — the content never used the word "pochette" except once, in an unrelated variant note.

**A real, non-actionable finding worth flagging**: four informational queries checked this run (`cranter def`, `encolure`, `patron couture definition`, `type de couture`) all carry a Google **AI Overview** at the top of the SERP, alongside dictionary/encyclopedia results (Larousse, Wikipedia, Le Robert). This explains the persistent 0% CTR on the new glossary cluster (`/glossaire/cranter/` — 50 impr/0 clicks; `/glossaire/encolure/` — 38 impr/0 clicks) and on `/blog/comprendre-patrons-couture/` (37 impr/0 clicks) despite decent positions (pos 7–10, within the skill's own "2–5% expected" band before halving for AI Overview). Same pattern as `SEO-CTR` precedent set on `cousette` last run: not a content problem, don't spend effort chasing it with title/meta rewrites.

## 2. Movement since last run

Full table in `rankings.csv` (67 tracked rows, first clean 4-week-adjacent diff since the migration).

**Gains:**
- `cours de couture castres`: 7.4 → **2.6**, 60%→26.9% CTR (still strong), 26 impressions. Real, GSC-confirmed. See §1 for the local-pack caveat.
- `trousse fermeture éclair 20 cm` cluster: see §1 — `SEO-CTR-007` validated.
- `atelier couture`: 13.1 → 8.1 (homepage).
- `atelier de couture et bordure`: 17.1 → 9.9.
- `atelier des cousettes` (unaccented, branded): 6.0 → 4.8, consolidated onto the homepage (see §1).
- New striking-distance queries surfaced from the glossary + "couture enfant" content published 2026-08-03, now ~2 months old and getting real impressions: `type de couture` (pos 7.4, 25 impr), `encolure` (pos 9.9, 14 impr), `cranter def` (pos 9.0, 30 impr), `couture pour enfant de 7 ans` (pos 10.0, 9 impr), `activité couture enfant 6 ans` (pos 10.2, 12 impr), `patron couture definition` (pos 7.0, 11 impr). All land on existing pages (`coutures-de-base`, `glossaire/encolure`, `glossaire/cranter`, `couture-enfants-projets-faciles`, `comprendre-patrons-couture`) — no new page needed, and per §1 most show 0% CTR because of AI Overviews, not a content gap.

**Losses (small, mostly noise):**
- `couturiere castres` (unaccented): 1.8 → 4.6. Low impressions (11); the live SERP for the accented "cours de couture castres" improved sharply over the same period, so this reads as query-variant noise rather than a real regression — not acting on it.
- The "autour de moi" cluster weakened across the board: `couture autour de moi` (1→8), `club de couture autour de moi` (5→12), `couturiere autour de moi` (1→2.6), `cours de couture autour de moi` (5.7→7.8). These are hyper-personalized, location-dependent queries with single-digit impressions each — GSC's average position for them mixes searchers at very different distances, so a shift in the national mix of searchers can move the average without any local ranking change. Flagged, not actioned; no catchall fix exists for "near me" averages.
- `trousse fermeture éclair` (bare, no "20 cm"): 13.5 → 22.5, but only 4 impressions — noise, and the qualified variants ("trousse fermeture éclair 20 cm" etc.) all improved, so the bare query likely just fragmented further as the qualified phrasing won more of the traffic.

**Local packs (fresh DataForSEO pulls, Castres + Revel):**
- **Castres — SERP feature compressed to 3 visible results** (see §1). Of the 3 shown, `Déco Couture` (1st, 20 reviews) and `La Fée Dymotite` (3rd, 25 reviews, up from 23) are familiar roster names; a third name (`L'Atelier de Josie`, 5 reviews) is new to our tracking. `Mercerie Floriane` (158 reviews) and `L'Atelier des Cousettes` (6 reviews) — both previously visible at rank 6–9 — are absent from the compact pack. Cannot confirm our current Castres GBP review count from this pull (the pack no longer surfaces it); Revel confirms incremental growth (see below).
- **Revel — pack diluted with new entrants, not a competitive loss.** L'Atelier des Cousettes: rank 9 → 11, but reviews grew 6 → 7. The pack grew from 9 to 12 visible listings, and three of the new entries (`Art'Effect Workshop`, `Atelier d'arts de Revel`, `Centre des Arts Corporels`) read as general arts/crafts spaces rather than direct sewing-course competitors — Google appears to be casting a wider "atelier" net for this query. `Atelier Artéli` held flat at rank 7, reviews flat at 6 (no longer closing the gap, unlike last run's trend).
- `latelierdescousettes.fr` (name-collision) and `couture-tarn.fr` (old domain): absent from both fresh organic + local-pack pulls this run — no action, keep watching.
- A second, unweighted DataForSEO pull (without the `os` parameter) showed `atelier-des-cousettes.fr` and `atelierarteli.fr` organic at different ranks than the `os`-matched pull — consistent with the skill's standing caution that single live SERP snapshots are noisy; GSC (primary) and the parameter-matched pull are what's reported above.

## 3. Did last run's changes work

| ID | Recommendation | Applied? | Ranking response |
|---|---|---|---|
| SEO-CTR-007 | Trousse tutorial `seoTitle` fix: add "(20 cm)" to the literal `<title>` tag | Yes, live | **Worked.** See §1/§2 — pos 10.9→7.1, CTR 2.9%→18.5% on the target query; the page's whole keyword cluster improved. |
| SEO-COVERAGE-005a | Internal link `idees-cadeaux-couture-faits-main` → `couture-enfants-projets-faciles` | Yes, live | **Resolved.** `Discovered - currently not indexed` → `Submitted and indexed`. No impressions yet (still building authority), but the indexing blocker is gone. |
| SEO-COVERAGE-005b | Internal link `coudre-tote-bag` → `coutures-de-base` | Yes, live | **Resolved, and already paying off.** `Discovered - currently not indexed` → `Submitted and indexed`; the page now has 59 impressions/28d and 1 click (pos 18.8) it didn't have in the last snapshot. |
| SEO-DECAY-006 | Consolidate-vs-expand call on 3 thin beginner posts (`debuter-couture-conseils`, `trousse-couture-indispensables`, `choisir-machine-a-coudre`) — awaiting user decision | Not applied (still awaiting the user) | **Worse, not stalled.** `trousse-couture-indispensables` and `choisir-machine-a-coudre` are still `Discovered - currently not indexed`, unchanged. `debuter-couture-conseils` **regressed further**, from `Discovered - currently not indexed` to `URL is unknown to Google` — Google has now effectively forgotten it exists. This is the fourth consecutive run flagging this; the trend is backward, not flat. See §4a. |
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | Owner action, outside repo | Revel: 6 → 7 reviews (small genuine growth, first movement in many runs). Castres: can't confirm this run — see §1/§2, the pack compression hides it. Still the single highest-leverage lever given §1's finding that Castres visibility is now gated on a 3-name pack. |

## 4. This run's improvements

**SEO-CTR-008 — applied.** `src/content/blog/coudre-trousse-fermeture-eclair/index.mdoc`: added "(ou pochette)" to the opening sentence ("la trousse (ou pochette) à fermeture éclair"), and bumped `lastModified` to 2026-10-01. Evidence: "tuto pochette avec fermeture éclair 20 cm" (48 impr, pos 8.9, 2.1% CTR) and "tuto pochette fermeture éclair 20 cm" (13 impr, pos 7.8, 0% CTR) together pull 61 impressions on this exact page, but the word "pochette" appeared only once in the whole article, in an unrelated variant ("pochette à maquillage"). The title/H1 and `seoTitle` keep "trousse" unchanged, since that wording already drives the page's best-performing queries (pos 4.5–7.1, 8–20% CTR) — this is a low-risk addition, not a repositioning.

No other Keystatic edit cleared the bar this run. The CTR-shaped opportunities on the glossary/definition cluster are explained by AI Overview suppression (§1), not a content defect; the branded-query split (§1) is too low-volume and too entangled with the still-settling domain migration to risk a title change on `/ateliers-reguliers/`; and `SEO-DECAY-006` is a structural content-strategy call this skill has repeatedly and correctly deferred to the user, not a "high-confidence, small" fix — see §4a for why it's now urgent.

### 4a. Index coverage audit (skill step 6a)

Ran `gsc.mjs inspect` on all 82 current sitemap URLs (parallelized, 8 concurrent):

| Coverage state | Count (this run) | Count (2026-08-26) |
|---|---|---|
| Submitted and indexed | 32 | 21 |
| Discovered - currently not indexed | 39 | 44 |
| URL is unknown to Google | 9 | 18 |
| Duplicate, Google chose different canonical than user | 1 | 2 |
| Crawled - currently not indexed | 1 | 0 |

- **Change-of-Address fallout resolved**: `la-couturiere` and `blog/entretenir-machine-a-coudre` are now `Submitted and indexed` with `googleCanonical === userCanonical` on `atelier-des-cousettes.fr`. `/conditions/` is now indexed too. `/contact/` improved from `unknown` to `Discovered - currently not indexed` — still needs the owner to hit "Request indexing" in the GSC UI (unchanged recommendation from last run, now closer).
- **One leftover canonical artifact, likely stale rather than live**: `blog/coudre-ourlet-invisible/` still shows `Duplicate, Google chose different canonical than user`, even though `googleCanonical` and `userCanonical` are now identical — its `lastCrawlTime` is 2026-08-18, six weeks old, and one of its `referringUrls` is still the old `couture-tarn.fr` copy (confirmed that URL still 301-redirects correctly to the live page). Reads as a label Google hasn't refreshed since the migration, not an active problem. Will confirm it clears on the next run once Google re-crawls.
- **New: `glossaire/recouvreuse` is `Crawled - currently not indexed`** (last crawl 2026-09-23) — Google fetched it and declined to index it. Single occurrence, not yet a pattern; watching.
- **The `SEO-DECAY-006` posts got worse, not better** (see §3): this is now the fourth run in a row flagging this, and `debuter-couture-conseils` just crossed from "discovered" to "unknown to Google" — a clear regression, not a plateau. **This needs the user's consolidate-vs-expand decision now.** Continuing to carry it forward unresolved isn't producing new information; the next run should treat "still no decision" itself as something to escalate more directly.
- **Glossary and stage pages still lag**: 24 of 34 glossary terms and 6 of the stage-detail pages remain `Discovered - currently not indexed`, roughly 8–9 weeks after publication — well past the "normal lag" window for a page this age, but consistent with last run's read: a single large content batch (55 glossary terms + 11 posts added 2026-08-03) still working through a small site's crawl budget, now showing real progress (10 glossary terms now indexed, up from roughly 0) rather than stalling.

### 4b. Competitor Labs rotation (steps 6b/7)

This run's turn: `lacouzeuse.org` (`ranked_keywords`, France, limit 50). Returned a single keyword — "furieuse company" (vol 70, rank 45, homepage) — unrelated to sewing/couture. Thinnest result yet in the rotation; this domain barely ranks for anything. **Next run's rotation: `acde-couture.fr`** (remaining after this: `atelieraslena.fr`, `latelierdesgourdes.fr`, then the cycle restarts at `atelierdecouture.fr`).

### 4c. Content-gap discovery (step 7)

One `keyword_ideas` call seeded from `couture enfant`, `patron de couture`, `type de couture` (the three clusters that gained real impressions this run) returned 50 results, all disconnected high-volume generic terms (`solitaire gratuit`, `jeux gratuit`, `femme nue`, `mondial tissu`, `maillot de bain femme` …) with zero topical relevance — the API's "ideas" broadened to generic trending searches rather than couture-adjacent terms for this particular seed combination. Nothing usable; wasted spend, noted in §6. No `SEO-NEW` suggestion this run — the clusters that did produce real traffic this run (glossary terms, "couture enfant") already have dedicated existing pages (§2), so there's no gap to suggest a new page for.

## 5. New content suggestions

None this run — see §4c. No prior `SEO-NEW` suggestions exist to track (none have been raised yet in the history of this loop).

## 6. Blockers and data caveats

- No GSC or DataForSEO blocker this run — both credentials worked throughout.
- First clean, non-overlapping 4-week-vs-4-week GSC diff since the domain migration (`2026-08-31–2026-09-28` vs `2026-08-03–2026-08-30`); read movement in §2 with normal confidence, not the "directional only" caveat of the last two runs.
- DataForSEO spend this run: ~9 live SERP calls (Castres ×3, Revel ×2, 4 informational diagnostics for the AI-Overview check) ≈ $0.018, + 2 Labs calls (`ranked_keywords` for `lacouzeuse.org` ≈ $0.013, `keyword_ideas` 3-seed ≈ $0.02, the latter wasted per §4c) ≈ **$0.051 total**, 2 of 3 Labs calls used.
- Cannot confirm the current Castres GBP review count for L'Atelier des Cousettes this run — the local pack there has compressed to 3 visible results that don't include us (§1/§2); would need a dedicated Google Business Profile / Maps lookup to get this number directly rather than reading it off the pack.
- The GSC `sites` endpoint still lists `couture-tarn.fr` as a separate, live property alongside `atelier-des-cousettes.fr` — this may be permanent (Search Console keeps historical properties indefinitely even post-migration) rather than evidence the Change of Address itself is still pending; the canonical/indexing symptoms that mattered are resolved (§1/§4a), so not treating this as an open item unless new symptoms reappear.
- Raw `gsc.mjs inspect` results (all 82 URLs) and DataForSEO responses saved under `raw/` for auditability.

*Next run should: (a) confirm the `SEO-CTR-008` pochette addition and the continued `SEO-CTR-007` trousse cluster hold or improve further; (b) re-check whether the Castres local-pack compression to 3 results is a lasting SERP feature or reverts — if it persists, GBP review growth (`SEO-GBP-004`) is now the only lever for Castres visibility at all; (c) re-run the index coverage audit — watch `/contact/` for a flip to indexed, watch `blog/coudre-ourlet-invisible/`'s stale canonical label for a refresh, and watch `glossaire/recouvreuse` for a pattern; (d) push the user again, more directly, for the `SEO-DECAY-006` decision — four runs now, and the trend just got worse; (e) rotate the competitor Labs call to `acde-couture.fr`; (f) if GBP reviews move on Castres or Revel, confirm the local-pack rank response.*
