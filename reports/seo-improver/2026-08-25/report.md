# SEO Improver — Scheduled run, 2026-08-25

Baseline for movement: `reports/seo-improver/2026-08-15/report.md` (most recent run, blocked). Last real `rankings.csv`/`competitors.csv` snapshot remains `reports/seo-improver/2026-07-15/` — the diff baseline used below, covering roughly six weeks.

**GSC access is restored.** `GSC_CREDENTIALS_JSON` now decodes to a proper service-account key and `node scripts/seo/gsc.mjs sites` succeeds — the credential-provisioning gap that blocked the 2026-08-01 and 2026-08-15 runs has been fixed outside this loop. This is the first successful full run since 2026-07-15.

## 1. Executive summary

**The single most important finding this run: a large, previously-invisible index-coverage regression, very likely tied to the 2026-08-03 site relaunch.** Of the 85 URLs now in the sitemap (up from 30 on 2026-07-15), only 21 are `Submitted and indexed`; 44 are `Discovered - currently not indexed` and 18 are `URL is unknown to Google`. Critically, this isn't just new content still working through the pipeline: all three long-standing `SEO-DECAY-006` posts that were `Crawled - currently not indexed` on 2026-07-15 have gone **backward** — two are now `URL is unknown to Google` and one dropped to `Discovered - currently not indexed`. A page regressing out of "Crawled" back to "unknown" means Google no longer has any record of having visited that URL — that doesn't happen from ordinary crawl-budget throttling. The timing lines up with a same-day content/structure relaunch (2026-08-03, per file history) that also added ~55 new URLs (36 glossary terms, several new blog posts and stage pages) in one push, and with two pages where Google's selected canonical still points at the old `couture-tarn.fr` domain months after migration. Read together, this looks like the relaunch disrupted Google's crawl model of the site rather than a one-off fluke. See §4a for the full table and recommended owner actions.

**Second finding, also new this run: a homepage SEO fix from six weeks ago had silently reverted.** `SEO-CTR-001`/`SEO-STRIKE-002` (the homepage `seoTitle`/`seoDescription` mentioning proximity to Castres, applied 2026-07-13, confirmed live 2026-07-15) were **absent** from the current homepage content — the `homepage/index.yaml` file's git history shows it was recreated during the same August restructuring, and the Castres language didn't make it into the new version. This matters concretely: GSC shows `couturiere castres` ranking **position 1.7** (essentially #2) with **11 impressions and zero clicks** over the last 28 days — a near-top ranking earning 0% CTR against an expected 12–18% for that position, exactly the symptom you'd expect from a title/description that no longer mentions the city being searched. **Applied this run**: restored the Castres mention in both fields (§4).

Third, real GBP evidence: **`SEO-GBP-004` (grow reviews) is now backed by a third consecutive data point.** Our own Revel local-pack rank continued sliding (7→8→9 across the last three checks) while reviews stay flat at 6; `Atelier Artéli`'s reviews kept climbing (3→4→5→6) over the same period. Castres, meanwhile, showed a small positive movement (rank 9→7, same review count) — worth noting so the picture isn't read as universally bad, but Revel's trend is now unambiguous.

One fix applied this run (§4); no new page/post suggestions (§5) — nothing cleared the evidence bar.

## 2. Movement since last run

**GSC (tracked keywords, vs. 2026-07-15's `rankings.csv`)** — full detail in `rankings.csv`:

- **Gained**: `couture` (12.7→1.0, but only 3 impressions — low-signal), `couturiere castres` (3.4→1.7, 11 impressions, still 0 clicks — see §1), `cours de couture autour de moi` (9.3→6.8, 25 impressions, still 0 clicks), `couturiere revel` (8.2→7.5, 30 impressions, 1 click), `cousette` (6.0→5.5, 65 impressions, still 0 clicks — see caveat below).
- **Lost**: `poser une fermeture éclair sur une trousse` (8.1→16.5, -8.4), `cours de couture` (9.7→15.1, -5.4), `trousse fermeture éclair` (9.8→13.5, -3.7), `trousse fermeture éclair 20 cm` (8.9→10.9, -2.0 — this is the page `SEO-CTR-003` retitled; see §3), `atelier couture` (13.0→14.7), `atelier de couture` (12.2→13.6).
- **New this run**: `cours de couture castres` — zero GSC visibility on 2026-07-15 (only a DataForSEO volume estimate), now **position 4.8, 5 impressions, 3 clicks, 60% CTR**. A genuinely good result — an underlying local ranking finally surfaced in GSC's own data, and it's converting well.
- **Dropped off** (had a real position 2026-07-15, zero impressions now — a 6-week rolling window, so treat as "currently quiet," not necessarily "lost forever"): `couturière revel` (was 10.4), `couturière indépendante` (was 6.7), `stage couture` (was 11.3), `cours de couture revel` (was 1.0 on very low volume).
- **Cannibalization, newly surfaced**: the branded query `l'atelier des cousettes` (24 impressions) splits across **three pages** — homepage (pos 6.1), `/ateliers-reguliers/` (pos 10.8), `/blog/` (pos 22.7) — and none of them is #1 despite this being the literal business name. Zero clicks across all 24 impressions. This is likely connected to the canonical/index confusion in §4a rather than a content problem to fix directly.

**Local packs (fresh DataForSEO pulls, Castres + Revel, organic depth 30)** — full detail in `competitors.csv`:

- **Castres — modest improvement.** L'Atelier des Cousettes climbed **rank 9 → 7** (still 5.0★/6 reviews, unchanged). Déco Couture also climbed (3→2, 20 reviews unchanged); La Fée Dymotite holds #1 (23 reviews). New entrants in this pull vs. the last: `Création L.A.K` (#5), `Mercerie Floriane` (#6, still the review-count outlier at 158), `Hera Création boutique A la folie!` (#9), `L'Atelier de KTY` (#11), `Atelier de Retouches LAMAINDEFABIE` reappeared (#12). Local packs reshuffle pull-to-pull; treat the +2 as a positive but not yet a settled trend.
- **Revel — the decline continues.** Our rank slipped again, **8 → 9** (three-run trend now: 7→8→9), reviews still flat at 6. `Atelier Artéli` ticked back from #6 to #7 in rank but its **reviews kept climbing, 5→6** — the fourth consecutive check showing this competitor's review count rising (3→4→5→6) while ours hasn't moved. Créa'Isi unchanged at #1 (31 reviews).
- **Castres organic — still unresolved, now a third contradictory data point.** GSC's own 28-day average position for `cours de couture castres` is 4.8 (from real impressions/clicks). Today's DataForSEO SERP pull independently puts `atelier-des-cousettes.fr` organically at rank **12** for the same query — following a rank-5 read on 2026-08-01 and rank-21 on 2026-08-15. Three single-snapshot DataForSEO pulls (5, 21, 12) don't converge on anything; per the skill's own data hierarchy, GSC is ground truth here, and its 4.8 average — corroborated by the excellent 60% CTR at that position — is what this report treats as the real signal going forward. Recommend not chasing single DataForSEO SERP pulls for this specific query anymore; GSC already answers it well.
- The name-collision domain (`latelierdescousettes.fr`) did not appear in either pull this run (seen briefly at #26 in Revel two runs ago) — consistent with the "likely noise" read at the time.
- **Rotating Labs call, this run's turn: `atelierdecouture.fr` via `domain_intersection`** (a lens not yet tried for this competitor; `ranked_keywords` was tried in July with the same result). All 13 gap keywords returned are either this competitor's own brand terms or Toulouse-geo queries (`atelier couture toulouse`, `formation couture toulouse`, etc.) — out of catchment per the project config. No usable gap, third dead end for this domain across two different Labs lenses. Next run's rotation: `cameleoncouturecreation.com` was already tried (weak, Albi-geo); `lacouzeuse.org`, `acde-couture.fr`, `atelieraslena.fr`, and `latelierdesgourdes.fr` have never been pulled via Labs — try `lacouzeuse.org` next.

## 3. Did last run's changes work

| ID | Recommendation | Status |
|---|---|---|
| SEO-CTR-001 / SEO-STRIKE-002 | Homepage `seoTitle`/`seoDescription` mention proximity to Castres | **Regressed — the fix was lost**, apparently when `homepage/index.yaml` was recreated during the August relaunch (its git history contains no earlier commit with the Castres language). Directly consistent with `couturiere castres` ranking #2 (pos 1.7) at 0% CTR (§1). **Re-applied this run** (§4) — restoring, not introducing, this fix. |
| SEO-CTR-003 | Trousse tutorial (`coudre-trousse-fermeture-eclair`) retitled + new H2 | Still live, confirmed via file content. But the tracked keyword `trousse fermeture éclair 20 cm` actually **lost** ground since 2026-07-15 (8.9 → 10.9) and CTR at position ~11 (2.9%) is roughly in line with expectations, not an outperformer. Six weeks was enough time for a clean read, and the read is neutral-to-slightly-negative — the retitle hasn't produced a visible lift. Not proposing to revert (too early to call it a failure outright, and the position drop may be unrelated SERP movement), but downgrading confidence; watch one more run before deciding whether to try a different angle. |
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | **Still 6 reviews everywhere, unchanged since tracking began.** Now backed by a fourth consecutive Revel data point showing the gap actively widening (Atelier Artéli 3→4→5→6 reviews while ours sits at 6 throughout) and a three-run Revel rank slide (7→8→9). Castres improved slightly on rank without any review movement, so the story isn't universally bad, but Revel's trend is now unambiguous. Still the single biggest lever, still outside this repo. |
| SEO-COVERAGE-005a/b | Internal links added (`idees-cadeaux-couture-faits-main`→`couture-enfants-projets-faciles`; `coudre-tote-bag`→`coutures-de-base`) | Both links still live (confirmed in file content). Neither target page has progressed since 2026-07-15 — both remain `Discovered - currently not indexed`. Linking was never the diagnosed problem for these two; tracked under §4a now alongside the wider coverage picture. |
| SEO-DECAY-006 | Consolidate-vs-expand decision on three thin posts (`choisir-machine-a-coudre`, `debuter-couture-conseils`, `trousse-couture-indispensables`) | **Still pending a user decision, and the case for consolidation just got stronger**: all three regressed in Google's index pipeline this run rather than holding steady (§4a). Recommend resolving this before the next run. |
| GSC credential fix | Blocking issue flagged 2026-08-01 and 2026-08-15 | **Resolved** — see header. First clean data in six weeks. |

## 4. This run's improvements

### SEO-CTR-001 (re-applied) — restore Castres to the homepage title/description

**Change made**, `src/content/pages/homepage/index.yaml`:
- `seoTitle`: `Cours de couture à Revel` → `Cours de couture à Revel et Castres`
- `seoDescription`: added `, à 20 min de Castres` after the Revel/Verdalle mention (kept the `de 28 € à 95 €` pattern intact for `remplacerFourchette`)

**Target keyword/URL**: `couturiere castres` → `https://atelier-des-cousettes.fr/` (position 1.7, 11 impressions, 0 clicks this window).

**Evidence**: a near-top-2 GSC ranking earning 0% CTR against an expected 12–18% at that position is the textbook signature of a title/description that doesn't match the query's location intent — and here the mismatch has a concrete cause: this exact fix existed and was verified live as recently as 2026-07-15, then vanished from the current file with no trace in its git history, most likely lost when `homepage/index.yaml` was recreated during the 2026-08-03 relaunch. This is restoring known-good copy, not experimenting with new copy — a low-risk, previously-validated-in-spirit change.

**Expected effect**: CTR on `couturiere castres` (and secondarily `cours de couture autour de moi`, another 0%-CTR local query on the same page) should move toward the 12–18% band for position 1–3 queries once the new title/description are crawled and re-served in the SERP snippet. Cannot claim a result yet — needs a future run's GSC pull once Google re-crawls the homepage.

Verified with `pnpm check` (0 errors) before committing.

### SEO-COVERAGE-007 (new) — index-coverage regression, needs owner action

Not a Keystatic fix — flagging for the site owner, since the repo-side technical setup (redirects, trailing slashes) checks out fine.

**Sitemap coverage snapshot (85 URLs, `node scripts/seo/gsc.mjs inspect` on all of them):**

| Coverage state | Count |
|---|---|
| Submitted and indexed | 21 |
| Discovered - currently not indexed | 44 |
| URL is unknown to Google | 18 |
| Duplicate, Google chose different canonical than user | 2 |

**What regressed vs. 2026-07-15's 9 flagged pages** (the only other run with a clean index-coverage check):

| Page | 2026-07-15 state | Now | Direction |
|---|---|---|---|
| `choisir-machine-a-coudre` | Crawled - currently not indexed | URL is unknown to Google | **Regressed** |
| `debuter-couture-conseils` | Crawled - currently not indexed | URL is unknown to Google | **Regressed** |
| `trousse-couture-indispensables` | Crawled - currently not indexed | Discovered - currently not indexed | **Regressed** |
| `coutures-de-base` | Discovered - currently not indexed | Discovered - currently not indexed | Unchanged |
| `couture-zero-dechet-projets-pratiques` | Discovered - currently not indexed | Discovered - currently not indexed | Unchanged |
| `couture-enfants-projets-faciles` | Discovered - currently not indexed | Discovered - currently not indexed | Unchanged |
| `choisir-fil-aiguille` | URL is unknown to Google | Discovered - currently not indexed | Improved |
| `couture-ete-accessoires-vacances` | URL is unknown to Google | **Submitted and indexed** | Improved |
| `points-couture-main-essentiels` | URL is unknown to Google | Discovered - currently not indexed | Improved |

Three regressions, three unchanged, three improved. The three regressions are the concerning part: going from "Crawled" back to "unknown to Google" means Google's index has no record of ever visiting that URL — not something that happens from routine crawl-budget throttling, and not explainable by these three posts simply being old and thin (they always were; that was the original `SEO-DECAY-006` diagnosis, and it didn't cause a *regression* before now).

**The two `Duplicate, Google chose different canonical` pages** reinforce the same story: `/la-couturiere/` and `/blog/entretenir-machine-a-coudre/` both currently show Google's selected canonical as the old `couture-tarn.fr` URL. Confirmed via `curl` that the 301 redirect from `couture-tarn.fr` to `atelier-des-cousettes.fr` is correctly live for both — this is not a broken redirect, it's Google's cached canonical choice lagging behind a correct technical setup, likely because the old domain still carries more accumulated authority/history in Google's index.

**Likely cause**: the 2026-08-03 site relaunch (per file history, the point at which most current content — including `homepage/index.yaml` and the entire `glossaire/` collection, 36 terms — entered the repo) added roughly 55 new sitemap URLs in one push while also, on the same rough timeframe, apparently disrupting Google's crawl record for at least three pre-existing pages. Both effects point the same direction: a large one-time change to the site's shape can cost crawl priority/trust site-wide for a period, on top of whatever specific mechanism reset these three pages' individual crawl history.

**Owner action, not code**: for the three regressed posts (`choisir-machine-a-coudre`, `debuter-couture-conseils`, `trousse-couture-indispensables`) and any of the 44 `Discovered - not indexed` pages older than ~2 weeks, use **« Demander une indexation »** in the GSC UI — the API doesn't expose this. Given the volume (44 pages), prioritize: the three regressed posts first, then the money pages (`stages-thematiques/*` subpages currently show `Discovered - currently not indexed` or `URL is unknown` — six of eight stage pages affected), then glossary terms last (lowest individual value). Also worth doing once: submit a **Change of Address** / re-verify canonical signal for `couture-tarn.fr` → `atelier-des-cousettes.fr` in GSC if that hasn't been done, to help the two duplicate-canonical pages resolve faster.

**No internal-linking or content fix applied here** — the pattern (a same-day cluster of regressions plus a 3× jump in sitemap size) points to something structural/priority-related that a link or two won't move, and 6 of these pages already have adequate internal linking per the 2026-07-15 audit.

## 5. New content suggestions

None this run. The rotating Labs call (`domain_intersection` for `atelierdecouture.fr`) returned only branded and Toulouse-geo keywords — no catchment-relevant gap. No topic-expansion (`keyword_ideas`/`related_keywords`) call was made this run: with the index-coverage regression as the clear priority finding and no fresh seed idea likely to beat the "no suggestion is better than a weak one" bar (prior runs already exhausted `ourlet`, `patron couture`, `machine à coudre`, `surjeteuse` without a usable gap), the remaining 2 of 3 Labs-call budget was left unspent rather than spent on a low-probability search.

## 6. Blockers and data caveats

- **GSC credential fix confirmed working** — first successful run since 2026-07-15; `node scripts/seo/gsc.mjs sites` returns both `atelier-des-cousettes.fr` and `couture-tarn.fr` properties as `siteRestrictedUser`.
- **`cousette` (65 impressions, 0 clicks, position 5.5) is likely not a real opportunity** despite the high search volume (6,600/mo nationally) — it reads as a generic/dictionary-style query (the French common noun for an apprentice seamstress) rather than commercial local intent, and the business name itself already contains the word. No title change is proposed for it.
- **DataForSEO spend this run**: 2 live SERP calls (Castres + Revel, depth 30, ~$0.012) + 1 search-volume batch call (22 keywords, $0.09) + 1 Labs call (`domain_intersection`, $0.01356) ≈ **$0.115**. One of three Labs calls used, per the cap.
- Raw API responses (GSC query/page pulls, all 85 `inspect` results, both SERP pulls, the Labs call, the search-volume batch) saved under `raw/` for auditability.
- The `SEO-CTR-003` page's position drop (§3) and the `l'atelier des cousettes` cannibalization (§2) are both worth a closer look next run once this run's homepage fix and the index-coverage owner actions have had time to land — hard to disentangle "genuine decay" from "collateral effect of the same relaunch" with only one post-relaunch data point.
- Sitemap grew from 30 URLs (2026-07-15) to 85 (this run) — the jump itself is not evidence of a problem, but it is the most plausible trigger for the coverage regression in §4a, and is offered as a hypothesis, not a confirmed root cause; no access to actual deploy/Search Console UI history to verify timing more precisely than file history allows.

*Next run: (a) confirm the restored homepage `seoTitle`/`seoDescription` are live and check whether `couturiere castres` CTR moved; (b) re-run the full index-coverage audit and check whether any of the three regressed posts or the two duplicate-canonical pages recovered, especially if the owner has requested indexing per §4a; (c) get the user's consolidate-vs-expand decision on the three `SEO-DECAY-006` posts — now overdue given the regression; (d) rotate the competitor Labs call to `lacouzeuse.org`; (e) `SEO-GBP-004` — Revel's three-run slide is the clearest open lever; (f) reassess `SEO-CTR-003`'s page once more data is in.*
