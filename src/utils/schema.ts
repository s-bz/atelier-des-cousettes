/**
 * Shared JSON-LD schema builders for service pages.
 *
 * Every service page uses the same BreadcrumbList + WebPage + Service + FAQPage
 * structure. This module centralises the construction so changes to author info,
 * area served, or schema shape only need to happen once.
 */

interface SiteSettings {
  authorName?: string | null;
  authorJobTitle?: string | null;
  facebookUrl?: string | null;
}

interface SchemaOffer {
  name: string;
  price: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface PageSchemaOptions {
  title: string;
  seoDescription: string;
  pageUrl: string;
  siteUrl: string;
  settings: SiteSettings | null;
}

interface ServicePageSchemaOptions extends PageSchemaOptions {
  offers: readonly SchemaOffer[];
  faqItems: readonly FaqItem[];
}

/**
 * Builds BreadcrumbList + WebPage schemas shared by all content pages.
 */
export function buildPageSchemas({
  title,
  seoDescription,
  pageUrl,
  siteUrl,
  settings,
}: PageSchemaOptions): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": siteUrl },
        { "@type": "ListItem", "position": 2, "name": title },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": title,
      "description": seoDescription,
      "url": pageUrl,
      "author": {
        "@type": "Person",
        "name": settings?.authorName,
        "jobTitle": settings?.authorJobTitle,
        "url": `${siteUrl}/la-couturiere/`,
        "sameAs": settings?.facebookUrl ? [settings.facebookUrl] : [],
      },
      "isPartOf": { "@id": `${siteUrl}/#website` },
    },
  ];
}

/**
 * Builds BreadcrumbList + WebPage + Service + FAQPage schemas for service pages.
 */
export function buildServicePageSchemas({
  title,
  seoDescription,
  pageUrl,
  siteUrl,
  settings,
  offers,
  faqItems,
}: ServicePageSchemaOptions): object[] {
  const schemas = buildPageSchemas({ title, seoDescription, pageUrl, siteUrl, settings });

  schemas.push({
    "@context": "https://schema.org",
    "@type": "Service",
    "name": title,
    "description": seoDescription,
    "provider": { "@id": `${siteUrl}/#organization` },
    "areaServed": { "@type": "AdministrativeArea", "name": "Tarn" },
    "serviceType": "Cours de couture",
    "offers": offers.map((o) => ({
      "@type": "Offer" as const,
      "name": o.name,
      "price": Number(o.price),
      "priceCurrency": "EUR",
    })),
  });

  if (faqItems.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map((item) => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer,
        },
      })),
    });
  }

  return schemas;
}
