# L'Atelier des Cousettes

Website for L'Atelier des Cousettes, a sewing workshop located in Tarn, France. Built with Astro and deployed on Vercel.

**Live site:** [couture-tarn.fr](https://couture-tarn.fr)

## Tech Stack

- **Framework:** [Astro](https://astro.build/) 6
- **CMS:** [Keystatic](https://keystatic.com/) (file-based headless CMS)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) 4
- **Hosting:** [Vercel](https://vercel.com/)
- **Content format:** Markdoc (`.mdoc` files)

## Getting Started

### Prerequisites

- Node.js >= 22.12.0

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

### Type Checking

```bash
pnpm check
```

## Project Structure

```text
src/
├── assets/        # Images
├── components/    # Astro & React components
├── content/       # Keystatic-managed content (Markdoc)
├── layouts/       # Page layouts
├── pages/         # Route pages
├── styles/        # Global CSS
└── utils/         # Helpers
```

## Content Pages

| Page | Description |
| ---- | ----------- |
| Accueil | Homepage with intro and announcements |
| Ateliers reguliers | Regular weekly/bi-weekly sewing workshops |
| Un apres-midi couture | Monthly afternoon sewing sessions |
| Stages thematiques | Themed discovery workshops |
| La couturiere | About the instructor |
| Mes creations | Portfolio / gallery |
| Mentions legales | Legal notices |

## Content Management (Keystatic)

Content is managed through [Keystatic](https://keystatic.com/), a file-based headless CMS that stores content as Markdoc files directly in the repository.

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
| Paramètres du site | `src/content/site-settings` | Site name, email, phones, social links, address |
| Accueil | `src/content/pages/homepage/` | Homepage with YouTube video embed |
| Stages thématiques | `src/content/pages/stages-thematiques/` | Themed discovery workshops |
| Ateliers réguliers | `src/content/pages/ateliers-reguliers/` | Regular workshops |
| Un après-midi couture | `src/content/pages/un-apres-midi-couture/` | Monthly afternoon sessions |
| La couturière | `src/content/pages/la-couturiere/` | About the instructor |
| Mes créations | `src/content/pages/mes-creations/` | Portfolio page |
| Mentions légales | `src/content/pages/mentions-legales/` | Legal notices |

Each page singleton has: title, subtitle, SEO description, cover image, and Markdoc content.

**Collections:**

| Collection | Path | Description |
| ---------- | ---- | ----------- |
| Créations | `src/content/creations/*` | Gallery items with image, category, and display order |

### Cover Images

Cover images are stored per page in `src/assets/images/covers/<page-slug>/` and referenced in each singleton's schema. They are optimized by Astro's built-in image pipeline at build time.
