# SEO Improver — Scheduled run, 2026-08-01

Baseline for this run: `reports/seo-improver/2026-07-15/report.md` (the most recent complete run; the six 2026-07-13 directories predate it). No new baseline PR reference found merged since — see §3.

**This run is blocked on Search Console.** `GSC_CREDENTIALS_JSON` is set but is the wrong credential type: it decodes to `"type":"authorized_user"` (an OAuth *user* credential — `client_id`/`client_secret`/`refresh_token`, the shape produced by e.g. `gcloud auth application-default login`), not the `service_account` JSON (`client_email`/`private_key`) that `scripts/seo/gsc.mjs` and `SETUP.md` both require. `node scripts/seo/gsc.mjs sites` fails immediately with `ERR_CRYPTO_SIGN_KEY_REQUIRED` before any network call — the script has no `private_key` to sign the JWT with. This is a credential-provisioning problem, not a Google-side rejection or a transient error. Per the skill's instruction for this situation, no ranking/CTR/index-coverage data is fabricated this run; per the same instruction, the report and branch are still pushed so the failure is visible.

Per this run's operational notes, the one check that doesn't depend on GSC — verifying the Google Business Profile local-pack status the last run flagged (`SEO-GBP-004`) — was still run via fresh DataForSEO SERP pulls for Castres and Revel. That produced a real, useful finding: see §2.

## 1. Executive summary

**Blocked run: no GSC data, no content changes applied.** The Search Console credential in this environment is an OAuth user token, not the service-account key the loop's tooling expects — fix by regenerating a service-account key per `SETUP.md` and setting it as `GSC_CREDENTIALS_JSON` in the scheduled routine's environment (or, if a user-token flow is intended going forward, `scripts/seo/gsc.mjs` needs a second auth path added — a deliberate code change, not something to improvise unattended).

The one real finding this run: **the site is back in the Castres Google Business Profile local pack** (rank 9 of 12, unchanged 5.0★/6 reviews) after being completely absent on 2026-07-15. Revel is unchanged (rank 7/9). Review counts are still stuck at 6 everywhere — `SEO-GBP-004`'s core ask (grow reviews toward the local top-3 benchmark of 20–23) is still not done. Also notable: a fresh organic SERP pull shows `couture-tarn.fr` now appearing at organic rank 5 for "cours de couture castres" — a query the last two runs' checks never found the site ranking for at all (top 20). Whether this reflects a real ranking gain or single-pull SERP noise can't be confirmed without GSC; flag it for the next successful run to check against real impressions.

No Keystatic edits this run — there is no ranking or CTR evidence to act on.

## 2. Movement since last run

**GSC (tracked keywords, index coverage): unavailable this run — see blocker above.** `rankings.csv` from 2026-07-15 remains the last real snapshot; the next successful run should diff against it directly (treat this run as a skipped week, not a new baseline).

**Local packs (fresh DataForSEO pulls, Castres + Revel, organic depth 20)** — this is real, freshly measured data:

- **Castres — recovered.** L'Atelier des Cousettes is back in the local pack at **rank 9 of 12** (5.0★, 6 reviews), having been completely absent on 2026-07-15 (was rank 8/9 before that). The pack also grew from 9 to 12 listings — six new entrants not seen in prior pulls (L'Atelier de Josie #2, Point ZIG ZAG #4, Mercerie Floriane #6 — 158 reviews, by far the largest review count in either pack, worth watching as a threat, Ev'lyn Couture & Retouches #7 — 85 reviews, Quartier des Tissus #10 — 75 reviews, L'Atelier de KTY #11, Atelier de Retouches LAMAINDEFABIE #12). Roster members: La Fée Dymotite holds #1 (23 reviews, unchanged); Déco Couture slipped one spot to #3 (still 20 reviews, unchanged — the pack got more crowded around them, not a review-count story).
- **Castres organic — new signal.** `couture-tarn.fr` now appears at **organic rank 5** for "cours de couture castres" (title: "L'Atelier des Cousettes: Cours de couture à Revel et Verdalle…"). Neither the 2026-07-13 nor 2026-07-15 checks found the site in the top 20 organic results for this exact phrase. `atelierdecouture.fr` appears at rank 20 (first time tracked for this specific query).
- **Revel — unchanged.** Local pack: still rank 7/9, 5.0★/6 reviews. Organic: still #1 for "cours de couture revel", matching every prior pull. Pack composition looks more volatile than Castres (several new entrants: Les Créations d'Alice #2, Lézard & Bobines #3, Cécil'Création #4, La Boite à Retouches #5, art et créations Revel #6, Atelier d'arts de Revel #9) but Créa'Isi still holds #1 (31 reviews, unchanged) and our own position/rating/reviews didn't move.
- **Competitor movement worth flagging**: Atelier Artéli's Revel local-pack rank improved 9→8, and their review count went 3→4 (a real, if small, gain — the first review-count movement seen for any roster competitor across runs). `atelierdecouture.fr`'s Revel organic rank improved 14→10. Two previously-tracked organic entries — `atelierarteli.fr` (was #6 in Revel) and the name-collision domain `latelierdescousettes.fr` (was #13 in Revel) — do not appear in this pull's top 20 at all; given the prior run's own note that local/organic SERPs are query-to-query volatile, this reads as noise rather than a confirmed drop, but worth reconfirming next run.
- Full detail in `competitors.csv`. No `rankings.csv` this run (no GSC data to populate it with).

## 3. Did last run's changes work

Cannot be assessed for anything that depends on GSC clicks/impressions/position (SEO-CTR-001/002/003, SEO-COVERAGE-005a/b, SEO-DECAY-006, the index-coverage audit) — the credential blocker prevents both `searchAnalytics.query` and URL Inspection calls.

The one item checkable without GSC:

| ID | Recommendation | Ranking response this run |
|---|---|---|
| SEO-GBP-004 | Owner action: grow GBP reviews toward the Castres top-3 benchmark (20–23) | **Reviews still 6 everywhere** (Castres and Revel), unchanged since tracking began — the owner action has not happened. Partial positive movement on the *visibility* side: Castres local-pack presence recovered (was absent 2026-07-15, now back at 9/12), but that's pack composition/volatility, not review growth, and the pack got more crowded (9→12 listings) so the recovery is not a clean win. Review growth is still the single biggest open lever; this makes seven-plus consecutive runs with zero movement on it. |

Everything else — SEO-CTR-001/002/003, SEO-COVERAGE-005a/b, SEO-DECAY-006 (the three thin beginner posts), and the outstanding "should GSC data was too fresh" question from 2026-07-15 — is untested this run and carries over unchanged to whenever GSC access is restored.

## 4. This run's improvements

None. No Keystatic content changes were made — there's no GSC-sourced ranking, CTR, or index-coverage evidence to base a change on this run, and per the skill's own rule, no ranking or CTR change is claimed without the data to support it.

## 5. New content suggestions

None. Content-gap discovery (DataForSEO Labs) was skipped this run — its value depends on cross-checking candidate keywords against real GSC impressions (see the 2026-07-15 run's `patron couture`/`ourlet` analysis for why), which isn't possible right now. Not spending the Labs budget on speculative gap-hunting with half the evidence missing.

## 6. Blockers and data caveats

- **Primary blocker: `GSC_CREDENTIALS_JSON` is the wrong credential type.** Decodes to `{"type":"authorized_user","client_id":...,"client_secret":...,"refresh_token":...,"account":"","universe_domain":"googleapis.com"}` — 7 keys, no `private_key`, no `client_email`. `scripts/seo/gsc.mjs` (and `SETUP.md`) both expect a Google service-account key. Running `node scripts/seo/gsc.mjs sites` throws `Error [ERR_CRYPTO_SIGN_KEY_REQUIRED]: No key provided to sign` at the JWT-signing step, before any HTTP request. Two ways to fix, for a human to choose between: (a) regenerate a proper service-account key per `SETUP.md` and add it as a Restricted user on the `atelier-des-cousettes.fr` Search Console property, replacing the current env var — the documented, zero-code-change fix; or (b) if a user-token flow is actually intended for this environment going forward, `scripts/seo/gsc.mjs` needs a second `accessToken()` path added for the standard OAuth refresh-token grant (`grant_type=refresh_token` against `oauth2.googleapis.com/token`) — a deliberate, reviewable code change, not something an unattended scheduled run should improvise on its own credentials file. Left unfixed for now; flagging both options rather than picking one silently.
- DataForSEO worked fine (`GET appendix/user_data` returns `status_code: 20000`) and was used for the two local-pack/organic checks in §2. Spend this run: 2 live SERP calls (Castres + Revel, depth 20) ≈ **$0.008**. No Labs calls made (see §5) — well under the 3-call cap.
- Raw DataForSEO responses for both pulls are saved under `raw/dataforseo/` for auditability. No `rankings.csv` and no index-coverage table this run — nothing to populate them with.
- Next successful run should: (a) confirm the GSC credential fix landed and do a full catch-up diff against 2026-07-15's `rankings.csv`; (b) re-run the full index-coverage audit (skill step 6a), which has now been skipped for one run; (c) reconfirm whether `couture-tarn.fr`'s new organic rank 5 for "cours de couture castres" shows up in real impressions; (d) reconfirm the Castres local-pack recovery and the `atelierarteli.fr`/`latelierdescousettes.fr` organic disappearances with a second pull before treating either as a trend; (e) get the user's consolidate-vs-expand decision on the three `SEO-DECAY-006` thin posts, still pending since 2026-07-15; (f) `SEO-GBP-004` — reviews still flat, now the longest-standing open item in the loop.
