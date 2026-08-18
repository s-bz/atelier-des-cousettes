# SEO Improver — Scheduled run, 2026-08-15

Baseline for this run: `reports/seo-improver/2026-08-01/report.md` (the most recent run; also blocked). Last real `rankings.csv` snapshot remains `reports/seo-improver/2026-07-15/rankings.csv` — still the diff baseline whenever GSC access is restored.

**This run is blocked on Search Console — same root cause as 2026-08-01, unresolved.** `GSC_CREDENTIALS_JSON` still decodes to an OAuth *user* credential (`type: "authorized_user"`, keys `client_id`/`client_secret`/`refresh_token`/`account`/`quota_project_id`) rather than the `service_account` JSON (`client_email`/`private_key`) that `scripts/seo/gsc.mjs` and `SETUP.md` require. `node scripts/seo/gsc.mjs sites` fails immediately with `ERR_CRYPTO_SIGN_KEY_REQUIRED` before any network call — the credential-provisioning gap flagged two weeks ago has not been fixed. Per the skill's rule, no ranking/CTR/index-coverage data is fabricated this run; the report and branch are still pushed so the failure stays visible.

DataForSEO credentials work fine, so — per the operational notes for this cloud run — the GBP/local-pack follow-up from 2026-08-01 was repeated with two fresh live SERP pulls (Castres, Revel). See §2.

## 1. Executive summary

**Second consecutive blocked run: no GSC data, no content changes applied.** The fix is still the one identified two weeks ago — regenerate a Google service-account key per `SETUP.md`, add it as a Restricted user on the `atelier-des-cousettes.fr` Search Console property, and set that JSON (not an OAuth user token) as `GSC_CREDENTIALS_JSON` for the scheduled routine. Nothing in this run's checks suggests the credential will self-correct; this needs a human to act on it outside the loop.

The real finding this run, from fresh DataForSEO pulls: **Atelier Artéli is climbing steadily in the Revel local pack** — rank 9 → 8 → 6 and reviews 3 → 4 → 5 across the last three checks (2026-07-15, 2026-08-01, today) — while our own Revel local-pack rank slipped 7 → 8 with reviews still flat at 6. This is now a clear, multi-run trend, not noise: a real competitor is gaining ground on review volume, the exact lever `SEO-GBP-004` has been asking the owner to pull for eight-plus consecutive runs. Castres is stable (rank 9/12, 5★/6, unchanged). One caveat worth flagging: the "cours de couture castres" organic rank-5 signal reported 2026-08-01 (then under the old `couture-tarn.fr` hostname, which now 301-redirects to `atelier-des-cousettes.fr`) does not reproduce today — the domain now shows at rank 21 for that query. Can't tell if that's a real regression or single-pull SERP noise without GSC impressions; flagged for the next successful run to check.

No Keystatic edits this run — no GSC-sourced ranking or CTR evidence to act on.

## 2. Movement since last run

**GSC (tracked keywords, index coverage): unavailable this run — see blocker above.** `rankings.csv` from 2026-07-15 remains the last real snapshot.

**Local packs (fresh DataForSEO pulls, Castres + Revel, organic depth 20):**

- **Castres — stable.** L'Atelier des Cousettes unchanged at **rank 9 of 12** (5.0★, 6 reviews), same as 2026-08-01. Pack composition still 12 listings but reshuffled: `L'Atelier de KTY` moved from #11 to #12 and `Atelier de Retouches LAMAINDEFABIE` (#12 last time) dropped out of this pull; two new entrants appeared — `Création L.A.K` (#5, 4.8★/16) and `Hera Création boutique A la folie!` (#8, 5★/3). Roster members unchanged: La Fée Dymotite still #1 (23 reviews), Déco Couture holds #3 (20 reviews, no further slide since the 2→3 move on 2026-08-01). `Mercerie Floriane` remains the standout non-roster threat at #6 with **158 reviews** — by far the largest review count in either pack — worth adding to the watch roster if it keeps outranking review-poor competitors.
- **Castres organic — the rank-5 signal did not reproduce.** 2026-08-01 found the site (then indexed as `couture-tarn.fr`) at organic rank 5 for "cours de couture castres." Today's pull finds `atelier-des-cousettes.fr` (the same site — `couture-tarn.fr` now 301-redirects to it) at **rank 21** for the identical query, and `atelierdecouture.fr` — rank 20 last time — doesn't appear in today's top 34 at all. Both look like SERP volatility on a single-market local query rather than a confirmed trend either direction; can't resolve without GSC impressions for the query, which is exactly why the credential fix matters.
- **Revel — local pack, real movement.** Our rank slipped **7 → 8** (still 5.0★/6 reviews — flat). `Atelier Artéli` continues the trend flagged 2026-08-01: rank **9 → 8 → 6** and reviews **3 → 4 → 5** over the last three checks — a genuine, sustained climb, not a one-off. Créa'Isi still holds #1 (31 reviews, unchanged). Pack composition otherwise similar to last pull (Les Créations d'Alice #2, Cécil'Création #3, Lézard & Bobines #4, La Boite à Retouches #5, art et créations Revel #7, Atelier d'arts de Revel #9).
- **Revel organic — a competitor drop and a re-appearance.** `atelierdecouture.fr` fell sharply from rank 10 (2026-08-01) to **rank 22** today — the opposite direction of the 14→10 climb flagged two runs ago; net effect is this competitor now looks weaker on this query than at any point tracked. `latelierdescousettes.fr` (the name-collision domain) reappeared at rank 26, having been absent from the 2026-08-01 pull (previously seen at #13) — consistent with the "likely noise, keep watching" read from last run. `atelierarteli.fr` remains absent from Revel organic across all three checks now (it only shows up via its GBP listing, `Atelier Artéli`).
- Full detail in `competitors.csv`. No `rankings.csv` this run — no GSC data to populate it with.

## 3. Did last run's changes work

Still unassessable for anything GSC-dependent — same blocker for a second run, so SEO-CTR-001/002/003, SEO-COVERAGE-005a/b, SEO-DECAY-006, and the outstanding "cours de couture castres rank 5" question all carry over untested.

The one item checkable without GSC:

| ID | Recommendation | Ranking response this run |
|---|---|---|
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | **Reviews still 6 everywhere**, unchanged since tracking began — now eight-plus consecutive runs with zero owner-side movement. This run sharpens the case: a direct roster competitor (Atelier Artéli, Revel) has grown from 3 to 5 reviews and climbed 9→8→6 in the local pack over the same three checks, while our own Revel rank slipped 7→8 with flat reviews. The gap isn't closing on its own — it's a competitor actively pulling ahead on the exact lever this recommendation has been asking for. |

## 4. This run's improvements

None. No Keystatic content changes were made — there's no GSC-sourced ranking, CTR, or index-coverage evidence to base a change on this run, and per the skill's own rule, no ranking or CTR change is claimed without the data to support it.

## 5. New content suggestions

None. Content-gap discovery (DataForSEO Labs) was skipped again this run for the same reason as 2026-08-01: it depends on cross-checking candidate keywords against real GSC impressions, which isn't possible right now. Not spending Labs budget on speculative gap-hunting with half the evidence missing.

## 6. Blockers and data caveats

- **Primary blocker, unresolved for a second run: `GSC_CREDENTIALS_JSON` is still the wrong credential type.** Decodes to `{"type":"authorized_user","client_id":...,"client_secret":...,"refresh_token":...,"account":"","quota_project_id":...,"universe_domain":"googleapis.com"}` — an OAuth user token, not a service-account key. `scripts/seo/gsc.mjs` throws `Error [ERR_CRYPTO_SIGN_KEY_REQUIRED]` at the JWT-signing step, before any HTTP call. Same two options flagged 2026-08-01, still unaddressed: (a) regenerate a proper service-account key per `SETUP.md`, add it as a Restricted user on the Search Console property, and replace the scheduled routine's `GSC_CREDENTIALS_JSON` — the documented, zero-code-change fix; or (b) if a user-token flow is intended going forward, add a second `accessToken()` path to `scripts/seo/gsc.mjs` for the standard OAuth refresh-token grant — a deliberate, reviewable code change that should go through a normal PR with a human reviewing it, not something this unattended run should improvise against its own credentials. **This is now the single highest-priority action item, ahead of any content work** — every GSC-dependent recommendation in the last two runs (SEO-CTR-001/002/003, SEO-COVERAGE-005a/b, SEO-DECAY-006, the index-coverage audit, the full rankings diff) is stalled on it.
- DataForSEO worked fine and was used for the two local-pack/organic checks in §2. Spend this run: 2 live SERP calls (Castres + Revel, depth 20) ≈ **$0.008**. No Labs calls made (see §5) — well under the 3-call cap. Raw responses saved under `raw/dataforseo/` for auditability.
- No `rankings.csv` and no index-coverage table this run — nothing to populate them with.
- Next successful run should: (a) confirm the GSC credential fix landed and do a full catch-up diff against 2026-07-15's `rankings.csv` (now covering a full month); (b) re-run the index-coverage audit (skill step 6a), skipped for two consecutive runs; (c) resolve whether "cours de couture castres" organic rank is really 5, 21, or somewhere in between, against real impressions; (d) reconfirm the Revel local-pack slide (us 7→8, Atelier Artéli 9→8→6) with GSC-side signal if the query surfaces there; (e) get the user's consolidate-vs-expand decision on the three `SEO-DECAY-006` thin posts, pending since 2026-07-15; (f) `SEO-GBP-004` — now the longest-standing open item in the loop, and the competitive gap it warns about is now demonstrably widening (Atelier Artéli), not just stagnant.
