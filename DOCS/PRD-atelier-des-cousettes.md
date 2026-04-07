# PRD: L'Atelier des Cousettes — Website Rebuild

## Context

The original website at **couture-tarn.fr** was a Notion workspace published through Popsy (a Notion-to-website wrapper). The site went down and needed to be rebuilt as a proper, maintainable website with a CMS.

Content was recovered from archive.org and directly from the Notion API. All text, images, pricing, and schedules were successfully extracted and preserved.

## Goals

1. **Restore the website** with all original content at couture-tarn.fr
2. **Add a CMS** (Keystatic) so the site owner can edit content without code changes
3. **Maintain the original clean, Notion-like aesthetic**
4. **Improve performance and SEO** over the Notion/Popsy setup
5. **Deploy on Vercel** for reliability and easy custom domain management

## Tech Stack

- **Framework:** Astro 6 (static site generator)
- **CMS:** Keystatic (file-based, Git-backed CMS with admin UI)
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel
- **Language:** TypeScript

## User Stories

### Visitor
1. As a visitor, I can browse the homepage to see the latest news, location info, and a promotional video
2. As a visitor, I can view the regular workshop schedule and pricing to decide which sessions to join
3. As a visitor, I can learn about private lesson options and pricing
4. As a visitor, I can browse thematic workshop offerings and upcoming dates
5. As a visitor, I can read about the couturière's background and expertise
6. As a visitor, I can view a gallery of creations to see the quality of work
7. As a visitor, I can contact the atelier via email, phone, or the contact form
8. As a visitor on mobile, I can navigate the full site comfortably

### Site Owner
1. As the site owner, I can log into /keystatic to manage all page content
2. As the site owner, I can update workshop schedules and pricing without developer help
3. As the site owner, I can add/remove news items on the homepage
4. As the site owner, I can add new creations to the gallery
5. As the site owner, I can update the mentions légales page

## Pages

| Page | Path | Description |
|------|------|-------------|
| Accueil | `/` | Homepage with hero, news, YouTube video, photo grid |
| Stages thématiques | `/stages-thematiques` | Day workshops: description, schedule, pricing |
| Ateliers réguliers | `/ateliers-reguliers` | Regular workshops: full schedule, pricing tiers |
| Cours particuliers | `/cours-particuliers` | Private lessons: description, pricing |
| La couturière | `/la-couturiere` | Biography in 3 sections with images |
| Mes créations | `/mes-creations` | Gallery with lightbox |
| Mentions légales | `/mentions-legales` | Legal information |

## CMS Schema (Keystatic)

### Singletons
- **Site Settings:** name, email, phones, Facebook URL, contact form URL, address
- **Homepage:** title, subtitle, location text, welcome text, YouTube video ID, news items, hero images
- **Stages thématiques:** title, description (markdoc), schedule (markdoc), pricing note
- **Ateliers réguliers:** title, description, content (markdoc), adhesion info, visitor price
- **Cours particuliers:** title, description, pricing options array
- **La couturière:** title, sections array (heading, text markdoc, image, alt)
- **Mentions légales:** title, content (markdoc)

### Collections
- **Créations:** title (slug), image, image alt, category (select), display order

## Design

- **Style:** Notion-like clean aesthetic with narrow reading column (max-w-3xl)
- **Font:** Inter / system sans-serif
- **Colors:** text #37352F, white background, accent #F7F6F3, primary #2F80ED
- **Layout:** Mobile-first, responsive breakpoints at sm/md/lg
- **Navigation:** Sticky top bar, hamburger menu on mobile
- **Components:** Hero, PricingCard, YouTubeEmbed (lazy-loaded facade), ContactCTA, ImageGallery with native dialog lightbox

## Contact Info
- **Email:** bultez.isabelle@gmail.com
- **Phone 1:** 06.95.78.36.34
- **Phone 2:** 05.63.73.13.19
- **Facebook:** facebook.com/atelierdescousettes
- **Contact form:** tally.so/r/wvGxVA

## Deployment
- Vercel with Astro adapter
- Custom domain: couture-tarn.fr
- Keystatic admin at /keystatic (server-rendered route)
- GitHub mode for production CMS editing

## Known Limitations
- Mentions légales content not recovered from archive.org (needs manual entry from Notion export)
- Favicon is the default Astro icon (original was 10x10px, needs a proper logo)
- Keystatic requires the PR #1527 patch for Astro 6 compatibility (postinstall script applies it automatically)
