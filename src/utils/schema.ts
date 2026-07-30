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

interface BreadcrumbItem {
  name: string;
  url?: string;
}

/** Filter out FAQ items with empty question or answer. */
function isValidFaqItem(item: FaqItem): boolean {
  return item.question.trim().length > 0 && item.answer.trim().length > 0;
}

/**
 * Le schéma FAQPage, ou rien.
 *
 * Renvoie `null` plutôt qu'un objet aux `mainEntity` vides : un FAQPage sans
 * question est un balisage qui promet ce que la page ne montre pas, et Google
 * traite l'écart entre les deux comme du balisage trompeur. Les pages de
 * formules s'en servaient déjà ; le blog en hérite, avec la même règle.
 */
export function buildFaqSchema(faqItems: readonly FaqItem[]): object | null {
  const valides = faqItems.filter(isValidFaqItem);
  if (valides.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".faq-question", ".faq-answer"],
    },
    "mainEntity": valides.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };
}

export interface HowToStep {
  name: string;
  text: string;
}

interface HowToOptions {
  name: string;
  description: string;
  pageUrl: string;
  steps: readonly HowToStep[];
  /** « 2 h », « 45 min » — tel que l'article l'annonce. */
  duree?: string | null;
  fournitures?: readonly string[] | null;
  image?: string | null;
}

/**
 * « 2 h 30 » → « PT2H30M ». Une durée ISO 8601, la seule que schema.org lise.
 *
 * Écrite en français dans le CMS parce que c'est là qu'elle se relit : demander
 * `PT2H30M` à Isabelle reviendrait à lui faire tenir un format de machine, et
 * une faute de frappe y serait invisible.
 */
export function dureeIso(texte: string | null | undefined): string | null {
  if (!texte) return null;
  const heures = Number(texte.match(/(\d+)\s*h/i)?.[1] ?? 0);
  // Les minutes : celles écrites après le « h » (« 2 h 30 »), ou seules (« 45 min »).
  const minutes = Number(
    texte.match(/h\s*(\d{1,2})\b/i)?.[1] ?? texte.match(/(\d+)\s*min/i)?.[1] ?? 0,
  );
  if (!heures && !minutes) return null;
  return `PT${heures ? `${heures}H` : ''}${minutes ? `${minutes}M` : ''}`;
}

/**
 * Le schéma HowTo d'un tutoriel — ou `null` s'il n'y a pas d'étapes.
 *
 * Réservé aux articles qui décrivent une réalisation pas à pas. Un guide
 * comparatif — « quelle machine choisir » — n'en est pas un, et le baliser
 * comme tel promettrait des étapes qu'aucun lecteur ne trouverait.
 */
export function buildHowToSchema({
  name,
  description,
  pageUrl,
  steps,
  duree,
  fournitures,
  image,
}: HowToOptions): object | null {
  const valides = steps.filter((s) => s.name.trim().length > 0 && s.text.trim().length > 0);
  if (valides.length === 0) return null;

  const totalTime = dureeIso(duree);
  const supply = (fournitures ?? []).filter((f) => f.trim().length > 0);

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "url": pageUrl,
    ...(image ? { "image": image } : {}),
    ...(totalTime ? { "totalTime": totalTime } : {}),
    ...(supply.length
      ? { "supply": supply.map((f) => ({ "@type": "HowToSupply", "name": f })) }
      : {}),
    // Pas d'`url` par étape : elle vaudrait une ancre vers un titre de section,
    // or les étapes sont saisies dans un champ à part et rien ne garantit qu'un
    // titre leur corresponde dans l'article. Une ancre morte est pire que pas
    // d'ancre — elle envoie le lecteur en haut d'une page qu'il a déjà ouverte.
    "step": valides.map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.name,
      "text": s.text,
    })),
  };
}

/**
 * Builds a BreadcrumbList schema from an ordered list of items.
 * The last item is treated as the current page (no URL).
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      ...(item.url ? { "item": item.url } : {}),
    })),
  };
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
    buildBreadcrumbSchema([
      { name: 'Accueil', url: siteUrl },
      { name: title },
    ]),
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
  const faqSchema = buildFaqSchema(faqItems);

  return [
    ...buildPageSchemas({ title, seoDescription, pageUrl, siteUrl, settings }),
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": title,
      "description": seoDescription,
      "provider": { "@id": `${siteUrl}/#organization` },
      "areaServed": { "@type": "AdministrativeArea", "name": "Tarn" },
      "serviceType": "Cours de couture",
      "offers": offers.map((o) => {
        const numericPrice = parseFloat(o.price);
        return {
          "@type": "Offer" as const,
          "name": o.name,
          "price": Number.isFinite(numericPrice) ? numericPrice : 0,
          "priceCurrency": "EUR",
        };
      }),
    },
    ...(faqSchema ? [faqSchema] : []),
  ];
}
