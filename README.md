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

Content is managed through Keystatic and stored as Markdoc files in `src/content/pages/`.
