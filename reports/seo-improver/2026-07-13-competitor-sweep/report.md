# Competitor sweep — 2026-07-13 (one-off, out of cycle)

A one-off catchment-wide competitor discovery, run interactively (not by the scheduled loop). 11 live SERP pulls at depth 20, `location_name: France`, `language_code: fr` — one « cours de couture + ville » query per catchment town (Castres, Mazamet, Revel, Labruguière, Puylaurens, Sorèze, Dourgne, Verdalle) plus « atelier couture tarn », « cours de couture tarn », « stage couture tarn ». Total DataForSEO spend: 11 × $0.004 ≈ **$0.04**. Raw responses in `raw/`.

## Purpose

Establish the competitor roster now embedded in the seo-improver skill's project config, and provide the baseline `competitors.csv` for the loop's new competitor-tracking step (step 6b). The next scheduled run diffs against this file.

## Key findings

1. **atelierdecouture.fr (L'atelier de couture d'Elise, Toulouse) is the strongest competitor by far**: organic rankings on 7 of 11 catchment keywords (best #5) *and* a 5★/27-review GBP presence in the local pack on Tarn-wide queries. First target for the rotating `ranked_keywords`/`domain_intersection` Labs call.
2. **The local packs are winnable on reviews**: our GBP has 6 reviews; Castres top-3 runs 20–23, Sorèze features L'Atelier aux 4 mains at 106 and Créa'Isi at 31, Tarn-wide pack leaders run 12–37. Consistent with the refined SEO-GBP-004 finding.
3. **Name collision**: latelierdescousettes.fr is an unrelated business (« Cours de couture et ateliers créatifs autour du fil ») ranking on « cours de couture revel » and « cours de couture verdalle ». Tracked in `competitors.csv`; flag if it gains on branded queries.
4. **Directories hold much of page 1**: zonecouture.fr, mailleapart.fr, atelier.tel, couturieres.nosavis.com, petitfute.com, jds.fr, intramuros.org, plus platforms (superprof.fr on 4 keywords, facebook.com on 10). mailleapart.fr ranks **#3 for « cours de couture verdalle » with our own listing** — claiming/updating these is free visibility. Actionable list: `DOCS/ANNUAIRES-LOCAUX.md`.

## Roster (as embedded in the skill config)

Organic domains: atelierdecouture.fr, cameleoncouturecreation.com, atelierarteli.fr, lacouzeuse.org, acde-couture.fr, atelieraslena.fr, latelierdesgourdes.fr. GBP names: L'atelier de couture d'Elise, Caméléon Couture Création, L'Atelier aux 4 mains, Créa'Isi, La Fabrique de Marjorie, La Fée Dymotite, Déco Couture, FIL EN STYLE, Atelier Fournier, Les créas de Sylvie C, L'atelier 3C. Watch: latelierdescousettes.fr.

## Caveats

- SERPs pulled with `location_name: France` + town-in-keyword rather than per-town geolocation; local-pack composition can differ for a searcher physically in the catchment. Good enough for roster discovery; per-town geolocated pulls remain the loop's method for measuring our own local-pack rank.
- `competitors.csv` here is the baseline: `previous_*` columns intentionally blank.
- Out-of-catchment entities that rank on Tarn-wide terms (e.g. Coud-ci Coud-ça in Gaillac, AB COUTURE in Albi) were observed but deliberately left off the roster per the catchment rule.
