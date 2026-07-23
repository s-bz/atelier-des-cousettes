#!/usr/bin/env node
// Google Search Console CLI — dependency-free port of atom-eve's search-console.ts.
// Auth is a Google service account added as a Restricted user on the property.
// The JWT is signed locally with node:crypto so no packages are needed and the
// key never leaves this process.
//
// Usage:
//   node scripts/seo/gsc.mjs sites
//   node scripts/seo/gsc.mjs query [json-body]
//   node scripts/seo/gsc.mjs inspect <url> [siteUrl]
//
// `query` posts to searchAnalytics/query. The optional json-body argument is
// merged over the defaults below (last 28 days, query+page dimensions, France).
//   node scripts/seo/gsc.mjs query '{"dimensions":["query"],"rowLimit":1000}'
//
// `inspect` calls the URL Inspection API for one URL: index verdict, coverage
// state (e.g. "Crawled - currently not indexed"), Google-selected canonical,
// last crawl time. Quota: 2000 inspections/day per property.
//   node scripts/seo/gsc.mjs inspect https://atelier-des-cousettes.fr/blog/coudre-tote-bag/
//
// Credentials: GSC_CREDENTIALS_JSON env var (whole service-account key JSON on
// one line), or the same variable in .env.local at the repo root.

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API_BASE = "https://searchconsole.googleapis.com/webmasters/v3";
const DEFAULT_SITE = "sc-domain:atelier-des-cousettes.fr";

function credentials() {
  let raw = process.env.GSC_CREDENTIALS_JSON;
  if (!raw) {
    try {
      const env = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
      const match = env.match(/^GSC_CREDENTIALS_JSON=(.*)$/m);
      if (match) {
        raw = match[1].trim();
        if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
          raw = raw.slice(1, -1);
        }
      }
    } catch {
      // no .env.local — fall through to the error below
    }
  }
  if (!raw) {
    console.error(
      "GSC_CREDENTIALS_JSON is not set (env var or .env.local). See .claude/skills/seo-improver/SETUP.md",
    );
    process.exit(2);
  }
  return JSON.parse(raw);
}

async function accessToken() {
  const { client_email, private_key } = credentials();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({ iss: client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  ).toString("base64url");
  const signingInput = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(private_key, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("Token exchange returned no access_token");
  return data.access_token;
}

async function api(path, init) {
  const token = await accessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`Search Console request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// URL Inspection lives under the v1 API, not webmasters/v3.
async function inspectUrl(inspectionUrl, siteUrl) {
  const token = await accessToken();
  const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ inspectionUrl, siteUrl }),
  });
  if (!res.ok) throw new Error(`URL inspection failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function isoDate(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86400_000);
  return d.toISOString().slice(0, 10);
}

const [command, bodyArg] = process.argv.slice(2);

switch (command) {
  case "sites": {
    console.log(JSON.stringify(await api("/sites"), null, 2));
    break;
  }
  case "query": {
    const overrides = bodyArg ? JSON.parse(bodyArg) : {};
    const { siteUrl = DEFAULT_SITE, ...body } = {
      // GSC data lags ~2 days; end the window there so numbers are final.
      startDate: isoDate(30),
      endDate: isoDate(2),
      dimensions: ["query", "page"],
      rowLimit: 500,
      dimensionFilterGroups: [
        { filters: [{ dimension: "country", operator: "equals", expression: "fra" }] },
      ],
      ...overrides,
    };
    const result = await api(`/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  case "inspect": {
    const url = bodyArg;
    const site = process.argv[4] || DEFAULT_SITE;
    if (!url) {
      console.error("Usage: node scripts/seo/gsc.mjs inspect <url> [siteUrl]");
      process.exit(1);
    }
    console.log(JSON.stringify(await inspectUrl(url, site), null, 2));
    break;
  }
  default:
    console.error("Usage: node scripts/seo/gsc.mjs <sites|query|inspect> [json-body|url]");
    process.exit(1);
}
