# L'Atelier des Cousettes

Website for L'Atelier des Cousettes, a sewing workshop located in Tarn, France. Built with Astro and deployed on Vercel.

**Live site:** [couture-tarn.fr](https://couture-tarn.fr)

## Tech Stack

- **Framework:** [Astro](https://astro.build/) 6
- **CMS:** [Keystatic](https://keystatic.com/) (file-based headless CMS)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) 4
- **Testing:** [Vitest](https://vitest.dev/) 4
- **Hosting:** [Vercel](https://vercel.com/)
- **CI:** GitHub Actions (test → type check → build)

## Getting Started

### Prerequisites

- Node.js 24.x
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The site runs at `http://localhost:4321`. The Keystatic admin UI is available at `/keystatic`.

### Build

```bash
pnpm build
pnpm preview
```

### Testing

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

### Type Checking

```bash
pnpm check
```

## Project Structure

```text
src/
├── assets/images/       # Optimized images (covers, blog, creations, homepage, couturiere)
├── components/          # Astro components
│   ├── BaseLayout       # → layouts/BaseLayout.astro (meta, header, footer, analytics)
│   ├── Hero             # Cover image with overlay + title/subtitle
│   ├── IntroSection     # Centered intro text + CTA
│   ├── CrossLinksSection # Links to related service pages
│   ├── FaqSection       # FAQ accordion (question/answer pairs)
│   ├── ContactCTA       # Link to Tally.so contact form
│   ├── ServiceCard      # Homepage service card with image + price
│   ├── DetailCard       # Anchor-linked detail card (stages, ateliers)
│   ├── BlogCard         # Blog listing card
│   ├── AnimatriceSection # Instructor bio with photo
│   ├── ValueProposition # Value proposition items
│   ├── YouTubeEmbed     # Lazy-loaded YouTube embed
│   ├── ContentPage      # Legacy Markdoc prose wrapper
│   ├── Header           # Sticky nav + mobile hamburger + skip-to-content
│   └── Footer           # Contact, navigation, copyright
├── content/             # Keystatic-managed content
│   ├── blog/            # Blog articles (Markdoc .mdoc)
│   ├── creations/       # Gallery items (YAML)
│   ├── pages/           # Page singletons (YAML + Markdoc)
│   └── site-settings.yaml
├── layouts/
│   └── BaseLayout.astro # HTML shell, meta tags, OG, analytics
├── pages/               # File-based routing
├── styles/
│   └── global.css       # Theme tokens, fonts, prose styles
└── utils/
    ├── ateliers.ts      # Atelier group definitions (single source of truth)
    ├── blog.ts          # filterPublishedPosts (date-based filtering)
    ├── images.ts        # resolveImage, resolveImageUrl (glob-based resolution)
    ├── nav.ts           # SERVICE_LINKS, getCrossLinks (cross-linking)
    ├── navLinks.ts      # Main navigation menu links
    ├── reader.ts        # Keystatic reader + getPageContext helper
    ├── schema.ts        # JSON-LD builders (breadcrumb, page, service, FAQ)
    ├── strings.ts       # toSlug, formatFrenchDate, splitParagraphs, splitLines
    └── __tests__/       # Unit tests (58 tests across 6 files)
```

## Content Pages

| Page | Route | Description |
| ---- | ----- | ----------- |
| Accueil | `/` | Homepage with services, value props, blog, YouTube |
| Ateliers réguliers | `/ateliers-reguliers` | Weekly/bi-weekly sewing workshops |
| Stages thématiques | `/stages-thematiques` | Themed discovery workshops |
| Un après-midi couture | `/un-apres-midi-couture` | Monthly afternoon sewing sessions |
| La couturière | `/la-couturiere` | About the instructor (biography sections) |
| Mes créations | `/mes-creations` | Portfolio / gallery with lightbox |
| Blog | `/blog` | Blog listing + `/blog/[slug]` articles |
| Mentions légales | `/mentions-legales` | Legal notices (noIndex) |

## Content Management (Keystatic)

Content is managed through [Keystatic](https://keystatic.com/), a file-based headless CMS that stores content directly in the repository.

### Accessing the Admin UI

- **Local:** Run `pnpm dev` and navigate to `http://localhost:4321/keystatic`
- **Production:** Go to `https://couture-tarn.fr/keystatic` (authenticates via GitHub)

### Storage Modes

- **Local development:** Content is read/written directly to disk (`storage: local`)
- **Production:** Content is committed to the GitHub repository (`storage: github`)

### Content Types

**Singletons** (one-off pages):

| Singleton | Path | Description |
| --------- | ---- | ----------- |
| Paramètres du site | `src/content/site-settings.yaml` | Site name, email, phones, social links, address |
| Accueil | `src/content/pages/homepage/` | Homepage with YouTube video embed |
| Ateliers réguliers | `src/content/pages/ateliers-reguliers/` | Regular workshops with grouped crénaux |
| Stages thématiques | `src/content/pages/stages-thematiques/` | Themed workshops with detail cards |
| Un après-midi couture | `src/content/pages/un-apres-midi-couture/` | Monthly afternoon sessions |
| La couturière | `src/content/pages/la-couturiere/` | Biography sections with images |
| Mes créations | `src/content/pages/mes-creations/` | Portfolio page settings |
| Index blog | `src/content/pages/blog-index/` | Blog listing page settings |
| Mentions légales | `src/content/pages/mentions-legales/` | Legal notices (Markdoc) |

**Collections:**

| Collection | Path | Description |
| ---------- | ---- | ----------- |
| Blog | `src/content/blog/*/index.mdoc` | Articles with cover image, publish date, SEO |
| Créations | `src/content/creations/*` | Gallery items with image, category, display order |

### Cover Images

Cover images are stored per page in `src/assets/images/covers/<page-slug>/` and referenced in each singleton's schema. They are optimized by Astro's built-in image pipeline at build time.

## Architecture

### Page Pattern

All pages follow a consistent section-based structure:

1. **Hero** — cover image with overlay + title/subtitle
2. **Introduction** — centered text + CTA (via `IntroSection`)
3. **Content sections** — page-specific structured content
4. **FAQ** — optional question/answer pairs (via `FaqSection`)
5. **Cross-links** — links to related services (via `CrossLinksSection`)

Sections alternate between accent background (`bg-[var(--color-bg-accent)]`) and no background.

### SEO

- JSON-LD schemas on every page (BreadcrumbList, WebPage, Service, FAQPage, Article, Person, LocalBusiness)
- Schema builders in `src/utils/schema.ts` — `buildPageSchemas()`, `buildServicePageSchemas()`, `buildBreadcrumbSchema()`
- Open Graph + Twitter Card meta tags via `BaseLayout`
- Sitemap via `@astrojs/sitemap`, `robots.txt` allows AI crawlers, `llms.txt` for machine-readable summary

### Image Pipeline

- All images in `src/assets/images/` (never `public/`) for Astro optimization
- `resolveImage()` / `resolveImageUrl()` resolve Keystatic paths via `import.meta.glob`
- Components receive pre-resolved `ImageMetadata` (not raw paths)
- Format: WebP, quality 60 (covers) / 80 (content), responsive widths

### Styling

- Mobile-first Tailwind CSS with CSS custom properties from `global.css`
- Fonts: Playfair Display Variable (headings), Manrope Variable (body)
- `.heading-font` utility class for non-heading elements needing the heading font
