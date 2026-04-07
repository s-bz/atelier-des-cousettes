# GEO Analysis — L'Atelier des Cousettes

**Site:** https://couture-tarn.fr
**Date:** 2026-04-07

---

## GEO Readiness Score: 62/100

| Criteria | Score | Weight | Weighted |
| --- | --- | --- | --- |
| Citability | 12/25 | 25% | 12 |
| Structural Readability | 16/20 | 20% | 16 |
| Multi-Modal Content | 10/15 | 15% | 10 |
| Authority & Brand Signals | 10/20 | 20% | 10 |
| Technical Accessibility | 14/20 | 20% | 14 |
| **Total** | | | **62/100** |

---

## Platform Breakdown

| Platform | Score | Notes |
| --- | --- | --- |
| Google AI Overviews | 70/100 | Strong local schema, FAQ markup, good SSR. Weak on content depth. |
| ChatGPT | 50/100 | llms.txt present, GPTBot allowed. No Wikipedia/Reddit presence. |
| Perplexity | 45/100 | PerplexityBot allowed. No Reddit/community citations to draw from. |

---

## AI Crawler Access Status

| Crawler | Status |
| --- | --- |
| GPTBot (OpenAI) | Allowed |
| ChatGPT-User (OpenAI) | Allowed |
| Claude-Web (Anthropic) | Allowed |
| PerplexityBot (Perplexity) | Allowed |
| Applebot-Extended (Apple) | Allowed |
| OAI-SearchBot (OpenAI) | Not listed (default allow) |
| ClaudeBot (Anthropic) | Not listed (default allow) |
| CCBot (Common Crawl) | Not listed (default allow) |

**Verdict:** Good. All major AI search crawlers are explicitly allowed.

---

## llms.txt Status

**Present:** Yes, at `/llms.txt`

**Quality:** Good. Contains structured summary, services with pricing, addresses, contact info, and page links.

**Improvements needed:**
- Add `## Key facts` section with specific numbers (years of experience, number of students, etc.)
- Add Isabelle's credentials explicitly ("CAP couture flou")
- Consider adding a `llms-full.txt` with detailed content from all pages

---

## Brand Mention Analysis

| Platform | Present | Impact |
| --- | --- | --- |
| Wikipedia | No | High negative — Wikipedia is the #1 citation source for ChatGPT (47.9%) |
| Reddit | No | High negative — Reddit is #1 for Perplexity (46.7%) and #2 for ChatGPT (11.3%) |
| YouTube | Yes (1 video embed) | Weak — video is by a third party, not owned channel |
| LinkedIn | Unknown | Moderate — no linked profile found in structured data |
| Facebook | Yes | Low impact for AI citation (Facebook is not crawled by most AI) |
| Google Business Profile | Unknown | Critical for local AI answers |

**Critical gap:** Brand mentions correlate 3x more with AI visibility than backlinks. The site has near-zero presence on platforms AI engines cite from.

---

## Passage-Level Citability Analysis

### Current State

The content is largely **schedule/date-focused** rather than **answer-focused**. AI engines extract self-contained answer blocks of 134-167 words, but most pages are lists of dates and prices without explanatory context.

### Pages with citability issues

**Homepage** — The intro is 1 sentence: "Venez pousser la porte de l'atelier pour nous rencontrer ! Vous etes les bienvenus !" This is not citable. AI needs a factual "what is this" block.

**Stages thematiques** — Good structure (H2 per stage, pricing in headings), but the intro is a single generic sentence. No "What is a stage de couture?" definition block.

**Ateliers reguliers** — Heavy on date lists, light on explanatory content. No answer to "What are the ateliers reguliers?" in the first 60 words.

**Un apres-midi couture** — Same pattern: 1-sentence intro then dates and prices.

**La couturiere** — Best content for citability: personal narrative, credentials, history. But written without accents (missing è, é, ê throughout), which may affect French NLP processing.

### Citable passages found (0 optimal-length blocks)

No page currently contains a self-contained 134-167 word block that answers a specific question with facts and specifics.

---

## Server-Side Rendering Check

**Status: Excellent**

- Astro with static pre-rendering (SSG) — all 7 pages are pre-rendered to HTML at build time
- Zero client-side JavaScript dependency for content
- All schema markup rendered server-side in HTML `<head>`
- AI crawlers will see the full content without JavaScript execution

---

## Top 5 Highest-Impact Changes

### 1. Add "definition blocks" to each page intro (HIGH)

Each page needs a 134-167 word self-contained introductory block answering "Qu'est-ce que [service]?" with:
- What it is
- Who it's for
- Where (Revel, Verdalle, Tarn)
- Price range
- Instructor credentials

**Example for stages-thematiques intro:**
> L'Atelier des Cousettes propose des stages de couture thematiques a Revel et Verdalle, dans le departement du Tarn. Animes par Isabelle Bultez, couturiere diplomee CAP couture flou, ces stages sont ouverts aux debutants comme aux couturiers confirmes. Les stages couvrent l'initiation a la machine a coudre (40EUR, 3h), la decouverte complete de la couture (90EUR, 7h), la surjeteuse (65EUR, 5h), le patronage (40EUR, 3h), et la creation de sacs et accessoires (40-50EUR). Chaque participant travaille sur sa propre machine a coudre dans un groupe de taille reduite. Les stages ont lieu a la maison des associations de Revel et a l'atelier prive de Verdalle. Une adhesion ponctuelle de 5EUR a l'association Les P'tits Piafs est demandee.

### 2. Build Reddit/community presence (HIGH)

- Post in French sewing subreddits (r/couture, r/france) or forums
- Answer questions about sewing in the Tarn area
- Mention the atelier naturally in relevant threads
- This directly impacts Perplexity and ChatGPT citation likelihood

### 3. Fix missing accents in la-couturiere content (MEDIUM)

The entire biography page is written without French accents ("etait" instead of "etait", "herite" instead of "herite"). This affects:
- French NLP/tokenization by AI models
- Content quality signals
- User experience

### 4. Add structured Q&A headings to content (MEDIUM)

Convert implicit information into explicit question-based headings:
- "## Quel est le prix d'un stage de couture ?" instead of "## Tarifs"
- "## Ou ont lieu les ateliers ?" as a new section
- "## Faut-il apporter sa machine a coudre ?"

These match the query patterns AI engines use to extract answers.

### 5. Add publication/update dates (MEDIUM)

Add `datePublished` and `dateModified` to page schema. AI engines prefer content with clear freshness signals. Currently no dates are present in any schema or meta tags.

---

## Schema Recommendations

### Already implemented (good)

- LocalBusiness with founder, opening hours, offer catalog
- Service schema on 3 service pages with pricing
- FAQPage schema on 3 service pages
- ImageGallery on creations page
- BreadcrumbList on all content pages
- WebSite schema on homepage

### Missing / recommended additions

1. **Person schema** for Isabelle with `sameAs` linking to her social profiles
2. **`datePublished` / `dateModified`** on all pages (via Article or WebPage schema)
3. **`sameAs`** on LocalBusiness expanded to include: LinkedIn, Google Business Profile URL, YouTube (if channel created)
4. **`knowsAbout`** on Person schema: "couture", "patronage", "surjeteuse", etc.

---

## Content Reformatting Suggestions

### Homepage

**Current intro:** "Venez pousser la porte de l'atelier pour nous rencontrer ! Vous etes les bienvenus !"

**Suggested rewrite (145 words):** Add a factual definition block before the welcome sentence. Start with "L'Atelier des Cousettes est un atelier de couture situe a Verdalle et Revel dans le Tarn..." followed by what services are offered, who runs it, and price range.

### All service pages

Add a structured summary block at the top of each page following this pattern:
1. First sentence: "X est [definition with location]"
2. Second sentence: who it's for
3. Third sentence: price range and duration
4. Fourth sentence: instructor credentials

### La couturiere

Add accents throughout. Add a structured "bio card" summary at the top:
- Name, qualification (CAP couture flou)
- Years of experience
- Location
- What she teaches
