# Setup — seo-improver

Two credentials power the loop. Google Search Console is required; DataForSEO is
optional (the competitive layer). Both go in `.env.local` at the repo root
(gitignored).

## Google Search Console (required)

The agent reads rankings through a Google service account that the Search Console
property trusts. Any Google Cloud project works; the only thing that ties it to the
site is adding its email as a user in Search Console.

With the gcloud CLI signed in:

```bash
gcloud services enable searchconsole.googleapis.com
gcloud iam service-accounts create seo-improver
gcloud iam service-accounts keys create /tmp/seo-improver-key.json \
  --iam-account=seo-improver@PROJECT_ID.iam.gserviceaccount.com
```

Without gcloud: in the [Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts),
enable the Search Console API, create a service account (no roles needed), and add a
JSON key (Keys → Add key). Keep the key file outside the project and delete it once
the env var is set.

Then the one step that is always manual: in
[Search Console](https://search.google.com/search-console), select the
`couture-tarn.fr` property → Settings → Users and permissions → Add user, and add the
service account's email. **Restricted** permission is enough; the agent only reads.

Set the variable in `.env.local`, the whole key JSON on a single line, single-quoted
so the embedded quotes and `\n` in the private key survive:

```
GSC_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"seo-improver@...iam.gserviceaccount.com",...}'
```

Verify:

```bash
node scripts/seo/gsc.mjs sites
```

The property must appear with a `permissionLevel` other than `siteUnverifiedUser`; an
empty list means the user-add step is missing or still propagating (it can take a
minute).

## DataForSEO (optional)

Provides who ranks above you, search volume, and keyword gaps. Sign up at
[dataforseo.com](https://dataforseo.com) (trial credit available), then copy the API
login and password from the [API Access page](https://app.dataforseo.com/api-access)
— they are separate from the dashboard sign-in.

```
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
```

Verify (expect `status_code: 20000`):

```bash
curl -s -u "$DATAFORSEO_LOGIN:$DATAFORSEO_PASSWORD" \
  https://api.dataforseo.com/v3/appendix/user_data
```

Without it the loop still runs on Search Console alone and notes that the
competitive layer was skipped.

## GitHub PR flow

Apply mode uses the already-authenticated `gh` CLI in this repo — no extra token
needed locally.
