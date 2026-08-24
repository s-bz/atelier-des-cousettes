# Security Audit — Accounts & Payments

**Date:** 2026-08-25
**Reviewer:** Claude Code (claude-opus-5), 5 parallel specialist agents + manual verification
**Scope:** Whole codebase, with depth on the account and payment surfaces for both admins and members
**Baseline:** `main` @ `74632ce` (the `inscription-en-ligne` branch merged mid-audit)
**Fixes branch:** `securite-audit-2026-08`

---

## Verdict

The security foundations of this codebase are **deliberately and correctly built**. The audit found no
authentication bypass, no privilege escalation, no payment forgery, no price tampering, and no SQL or
XSS injection. The controls that matter most are all present and were each verified by hand rather than
taken on trust.

Eight issues were found and fixed. Three are MEDIUM — one real PII disclosure, one over-permissive
database grant, and one integrity gap in promo-code accounting. The rest are defence-in-depth.

| # | Severity | Category | Location | Status |
|---|----------|----------|----------|--------|
| 1 | MEDIUM | `data-exposure` / IDOR | `ateliers-reguliers/inscription/retour.astro:107` | ✅ Fixed |
| 2 | MEDIUM | `broken-access-control` | `20260729103454_harden_privileges.sql:29,67,76` | ✅ Fixed |
| 3 | MEDIUM | `business-logic` | `codes-promo.ts:107`, `20260825120000:73` | ✅ Fixed |
| 4 | LOW | `html-injection` | `emails.ts:356` | ✅ Fixed |
| 5 | LOW | `path-injection` | `notifications.ts:118`, `helloasso.ts:360` | ✅ Fixed |
| 6 | LOW | `error-disclosure` | `planning.astro:80`, `membre.ts`, `retour.astro:40` | ✅ Fixed |
| 7 | LOW | `data-integrity` | `notifications.ts:57-63` | ✅ Fixed |
| 8 | INFO | `documentation` | `guards.ts:16-18` | ✅ Fixed |
| A | LOW | `enumeration` | `api/devis.json.ts:39` | ⚠️ Accepted by design |
| B | LOW | `enumeration` | `api/devis.json.ts:53-57` | ⚠️ Needs rate limiting |

---

## Findings

### 1. MEDIUM — Unauthenticated disclosure of any payer's email address

**File:** `src/pages/ateliers-reguliers/inscription/retour.astro:24, 72, 107`

The public payment-return page took `checkoutIntentId` straight from the query string, re-read the
corresponding HelloAsso checkout intent using the association's own API credentials, and printed the
payer's email address back to whoever made the request. There was no session requirement (correct — the
account is created by this very request) and no binding between the requester and the intent.

The page's own header comment stated the invariant it was breaking:

> *« Elle ne montre donc rien de personnel »* — it therefore shows nothing personal

That made this an unambiguous defect rather than a design trade-off: **the code contradicted its own
documented contract.** Its member-area twin (`espace-membre/inscription/retour.astro:25`) requires a
session and correctly displays no email.

**Exploit.** An attacker completes one purchase, learns the magnitude of their own `checkoutIntentId`,
and walks the neighbouring range. `lireIntention` is organisation-scoped, so only this association's
intents resolve — a miss renders a generic error, a hit renders an email address:

```http
GET /ateliers-reguliers/inscription/retour/?checkoutIntentId=48291337
→ "Votre accès est ouvert à l’adresse marie.dupont@example.com."
```

**Fix applied.** Removed the `email` state, its assignment, and the interpolation; the sentence now reads
*« à l'adresse que vous venez d'indiquer »*, which is true for the actual payer and discloses nothing to
anyone else. The header comment was extended to state explicitly why the payer's address must never
appear here. A numeric-format guard was added on `checkoutIntentId` (see finding 5).

---

### 2. MEDIUM — Members could bypass every booking rule by writing to `bookings` directly

**File:** `supabase/migrations/20260729103454_harden_privileges.sql:29, 67-70, 76-82`

```sql
grant select, insert, update on bookings to authenticated;
create policy bookings_own_insert on bookings for insert to authenticated
  with check (participant_id in (select id from participants where account_id = current_account_id()));
create policy bookings_own_update on bookings for update to authenticated
  using  (participant_id in (...)) with check (participant_id in (...));
```

Both policies gated **only** `participant_id`. Every business rule — capacity, waitlist depth, cancelled
sessions, audience matching, and credit accounting — lives exclusively inside `book_participant` and
`release_booking`. A direct table write skipped all of them.

The financial edge is `credit_retenu`, the flag that makes a late cancellation billable
(`20260730071219:33`). Clearing it is an admin-only gesture in the UI; a member could set it themselves.
Since `20260825140000` this also exposes `helloasso_order_id`, the idempotency anchor of a paid seat.

**Reachability — stated honestly.** This requires a legitimate member, not an anonymous visitor. The
session JWT lives in an `httpOnly` cookie, which blocks page JavaScript but not the account holder
reading their own browser storage. Whether the Supabase gateway then accepts that user JWT as the
`apikey` header depends on the project's key configuration; this project uses the newer
`sb_publishable_…` / `sb_secret_…` format, and the publishable key is never exposed client-side. So
exploitation is plausible but not proven end-to-end. **The grant is over-permissive regardless**, and
the fix is free — which is why it was applied rather than debated.

**Fix applied.** New migration `20260825150000_bookings_par_les_fonctions_seules.sql` revokes
`insert, update` from `authenticated` and drops the two write policies. `bookings_own_read` is kept —
the member screens still read their own reservations.

**Verified to be a no-op for the application before applying:** `getServerClient` — the only client that
runs as `authenticated` — is *never called anywhere in the codebase*. All eighteen `bookings` accesses go
through `getAdminClient` (role `service_role`, unaffected by grants to `authenticated`), and both RPCs are
`SECURITY DEFINER` so they write as their owner.

---

### 3. MEDIUM — Promo-code usage ceiling was unenforced and its failure invisible

**Files:** `src/utils/codes-promo.ts:107`, `supabase/migrations/20260825120000_codes_promo.sql:73`

Two halves of one rule sat on opposite sides of the boundary:

- `incrementer_usage_code` incremented **unconditionally** — no check on `usages_max`, `expire_le`, or
  `archived_at`.
- The ceiling existed only in TypeScript (`reductionDe`, `codes-promo.ts:62`), read against a counter that
  this RPC is the *sole writer* of.
- `compterUsage` **discarded the result entirely** (`await supabase.rpc(...)` with no error capture), as did
  both call sites.

A permission drift, a renamed function, or a revoked grant would therefore turn every limited-use code
into an unlimited one, silently and with no error surfaced anywhere.

**Fix applied.** The migration recreates `incrementer_usage_code` to enforce the ceiling, the expiry, and
the archive flag in its own `WHERE` clause, returning `boolean`. Because the guard now sits in the same
statement as the increment, two simultaneous payments on a code's last use serialise on the row and can
no longer both succeed. `compterUsage` returns that boolean and logs distinctly when the RPC errors versus
when the database declines — the payment stands either way, but it is no longer invisible.

---

### 4. LOW — HTML attribute injection into outbound emails

**File:** `src/utils/emails.ts:356-357, 494`

```ts
const echapper = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
```

`echapper` escaped `&`, `<`, `>` but **not** `"`, while the link-detection regex `[^\s<]+` happily matched
one. Participant first/last names originate in the public inscription form and reach these templates via
`{{prenom}}` and the Sunday admin recap.

Registering with the first name `https://a.co/"style="display:none` produced an anchor carrying an
attacker-chosen attribute in the message Isabelle receives. LOW because mail clients strip `on*` handlers,
so this is content spoofing, not script execution.

**Fix applied.** `"` → `&quot;` and `'` → `&#39;` added to the escape chain; `URL_SEULE` tightened.

**A regression I introduced and then corrected.** My first patch also excluded `&` from the URL character
class. Because `echapper` runs *first*, a query-string URL is already `&amp;` by that point, so the
exclusion truncated every multi-parameter link at its first parameter. I verified this empirically, reverted
that half, and added a guard test. The escaping fix alone fully closes the injection — once `"` is `&quot;`
it can no longer terminate an attribute.

**Tests:** one reproducing the injection (written failing first, per the repo's TDD convention) and one
pinning the query-string behaviour.

---

### 5. LOW — Attacker-controlled path segment in an authenticated HelloAsso call

**Files:** `src/pages/api/helloasso/notifications.ts:118`, `src/utils/helloasso.ts:360`

`POST /api/helloasso/notifications/` is unauthenticated by design, and `checkoutIntentId` was neither
coerced to a number nor validated before being interpolated into an API path. `fetch` normalises `..`
segments, so a crafted value redirected the request — bearing the association's OAuth token — at a
different endpoint:

```json
{"eventType":"Order","data":{"id":1,"checkoutIntentId":"../../../organizations/other/orders"}}
```

**This is not SSRF** — host and scheme are constant, and the response is never echoed to the caller. Hence
LOW.

**Fix applied.** The webhook now accepts only a number or a `^\d{1,20}$` string, treating anything else as
"nothing to provision". Both return pages apply the same guard. `lireIntention` additionally wraps the id
in `encodeURIComponent`, closing the choke point for any future caller.

---

### 6. LOW — Raw upstream and Postgres errors returned to users

Three sites returned internal error text to the browser:

| Location | Leaked |
|---|---|
| `espace-membre/inscription/retour.astro:40` | HelloAsso error strings, including *`HELLOASSO_CLIENT_ID ou …_SECRET manquant.`* |
| `espace-membre/planning.astro:80` | Raw `book_participant` error — function names, constraints, `RAISE` text |
| `utils/membre.ts` (`libererPlace`) | Raw `release_booking` error, surfaced via `planning.astro:133` |

The *public* return page already handled this correctly with a fixed sentence; the member-area twin simply
had not been updated to match.

**Fix applied.** All three now log the detail server-side (where Isabelle can read it) and show a fixed
sentence. The ~25 `error.message` interpolations under `admin/**` were left alone: they are admin-only, on a
single-operator site, and genuinely useful there.

---

### 7. LOW — Unauthenticated webhook events could pre-claim a genuine event's key

**File:** `src/pages/api/helloasso/notifications.ts:57-63`

The event key is derived from an unsigned payload and inserted with `ignoreDuplicates: true`. Anyone
guessing an order id could deposit their own payload under the key the real notification would carry; the
genuine one was then dropped as a duplicate, leaving the attacker's row — already stamped `traite_le`, and
therefore absent from the *"à traiter"* recovery queue. Precisely the "someone paid and appears nowhere"
failure the file's header warns against.

Provisioning itself was never at risk: it re-reads the intent from HelloAsso and trusts nothing in the body.

**Fix applied.** Unauthenticated events are namespaced `na:<key>`, so a forged event can never collide with
a genuine one. Verified first that nothing parses the key format — it is used only as an opaque `.eq()`
filter and for display.

---

### 8. INFO — `guards.ts` documented a safety net that does not exist

`src/utils/guards.ts:16-18` claimed authorization ultimately rested on RLS, and that a page forgetting
`requireAdmin` could not expose everyone's data. **That is not true of the deployed system.**
`getServerClient` — the RLS-respecting client — is never called anywhere; every route uses
`getAdminClient`, whose secret key bypasses RLS by construction.

All guards are currently complete (14/14 admin pages verified twice), so there is no live bypass. But the
comment would mislead the next person to reason about blast radius. Corrected to state that the guards *are*
the boundary.

---

## Accepted risks — deliberately not "fixed"

### A. `/api/devis.json` discloses whether an address has a paid membership

`adhesionCents: 0` versus `1500` reveals, to an unauthenticated caller, whether an arbitrary email belongs
to a family that has paid this season.

**Not changed, and deliberately so.** The endpoint documents this at lines 18-22, and commit `de2f53b`
states it outright: *« CE QUE CETTE ROUTE RÉVÈLE, et qui est assumé »*. Gating it behind a session would
destroy the feature that commit shipped — showing a returning family its reduced price without logging in.
Silently reversing a reasoned product decision is the owner's call, not the auditor's.

Worth noting the trade-off was reasoned about for *the person filling in the form*, not for a third party
probing a list of addresses. If that ever matters, the fix is to bind `email` to a nonce issued by the
inscription page rather than to require a session.

### B. Promo codes are brute-forceable through the same endpoint

Two agents proposed collapsing the four `codeErreur` messages into one. **I did not apply this, because it
does not work.** A valid code returns `codeErreur: null` plus the exact discount — that is the signal an
attacker wants, and no amount of message-merging hides it. Collapsing the messages would cost real UX
(*« expiré »* vs *« épuisé »* closes the question for an honest user) and buy nothing.

The genuine mitigation is rate limiting or a CAPTCHA on `/api/devis.json`, which is explicitly out of scope
for this review. Recorded here so the decision is visible. Note that finding 3's fix does limit the damage:
a guessed code can no longer be redeemed past its ceiling.

---

## Retracted — a false positive of my own

I initially flagged four JSON-LD blocks as missing the `</` escape. That was an artefact of too narrow a
grep window: the escape sits at the *end* of each multi-line `JSON.stringify([...])`. An exhaustive check
confirms **13 of 13 blocks are correctly escaped**. No change needed, and none made.

---

## Verified clean

Each of these was checked by hand, not assumed:

**Authentication & session.** `middleware.ts:35` uses `getUser()` (revalidates against the auth server),
not `getSession()`. The admin role is read **from the database**, never from JWT claims — defeating the
standard Supabase escalation path through self-editable `user_metadata`. `role` is written in exactly one
place, hardcoded `'member'` (`inscriptions.ts:110`); no code path assigns `'admin'`. The `catch` fails
closed. Cookies are forced `httpOnly` / `sameSite: lax` / `secure` in prod regardless of what the library
proposes. OTP uses a numeric code, so no token ever appears in a URL.

**Admin authorization.** All 14 admin pages call `requireAdmin` as their first statement — before any data
fetch *and* before any POST mutation. Independently re-verified with a script; the coverage matrix is 14/14
with no GET/POST divergence anywhere.

**Payment integrity.** Price tampering is not possible: every form field is an identifier resolved against
the database or a display label; the schedule is built solely by `construireEcheancier` from the DB price.
The webhook is unauthenticated **but never trusts its body** — only the intent id is read, and the order is
re-fetched over an OAuth'd call where `order` appears only once payment is authorised. A forged
`{"state":"Authorized","amount":…}` provisions nothing. Replay grants nothing (`helloasso_order_id` is
unique). Discounts cannot drive a total negative.

**Database.** `anon` has no schema `USAGE` and no grants — the entire "public anon key + `USING (true)`"
class is inapplicable here, and the key is server-only regardless. RLS is enabled on all 11 tables. All 12
`SECURITY DEFINER` functions pin `search_path`; the two reachable by a member perform their own ownership
checks. No dynamic SQL is injectable (the single `format()` uses `%I` on catalogue-derived identifiers).

**Injection & endpoints.** No XSS from user input — every `set:html` carries either escaped JSON-LD or
Markdoc from CMS content authored by a single trusted editor. `DevisEnDirect` uses `textContent`
exclusively. iCal fields are RFC 5545-escaped. The calendar token is a 122-bit CSPRNG UUID, format-checked,
role-checked, and served `Cache-Control: private`. `astro.config.mjs` sets no `security` block, so Astro 7's
`checkOrigin` default (`true`) is active — CSRF is covered on all cookie-authenticated POSTs. The cron
endpoint requires `Bearer $CRON_SECRET` and fails closed when the secret is unset. No secret carries a
`PUBLIC_` prefix, and a unit test fails the build if one ever does.

---

## Verification

- `npx vitest run` → **348/348 passing**, including the two new email tests.
- `npx astro check` → **0 errors, 0 warnings** (23 pre-existing hints, untouched).
- The bookings revocation was proven a no-op for the application *before* being written.
- The email-escaping regression was caught and corrected before completion.

## Deployment note

Migration `20260825150000_bookings_par_les_fonctions_seules.sql` must be applied for findings 2 and 3 to
take effect. It is additive and safe to apply to a live database: it revokes privileges no application code
path uses, and recreates one function whose grants it restores explicitly.

## Working-tree note

**Nothing was committed.** During the audit the tree gained unrelated in-progress feature work — the
"réservation payée à l'unité" change set (`src/utils/achat-unite.ts`, a substantial `provisionnement.ts`
rewrite, `preparerAchatUnite` in `helloasso.ts`, and migration `20260825140000_reservation_payee.sql`).
Committing would have swept that up as if it were part of this audit. The security fixes sit uncommitted on
`securite-audit-2026-08` alongside it; the full suite passes with both together. Separate the two before
committing.
