/**
 * Shared JSON-LD schema builders for service pages.
 *
 * Every service page uses the same BreadcrumbList + WebPage + Service + FAQPage
 * structure. This module centralises the construction so changes to author info,
 * area served, or schema shape only need to happen once.
 */

interface SiteSettings {
  siteName?: string | null;
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

/** Une date programmée, réduite à ce qu'un moteur a besoin de savoir. */
export interface SeanceSchema {
  /** Le nom du créneau ou du stage — « Atelier du mardi après-midi ». */
  nom: string;
  /** Horodatage ISO 8601 avec fuseau, tel que la base le renvoie. */
  debut: string;
  fin: string;
  lieu: string;
  /** En euros. `null` quand la base n'en porte pas. */
  prix?: number | null;
}

interface CourseOptions {
  name: string;
  description: string;
  pageUrl: string;
  siteUrl: string;
  settings: SiteSettings | null;
  seances: readonly SeanceSchema[];
  /** Le repli quand aucune date n'est programmée : « Séances de 3 h ». */
  charge?: string | null;
  /** Le lieu par défaut du repli — « Revel », « Verdalle ». */
  lieuParDefaut?: string | null;
}

/** « PT2H30M » entre deux horodatages. `null` si l'ordre est incohérent. */
function dureeIsoEntre(debut: string, fin: string): string | null {
  const minutes = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}`;
}

/**
 * Le schéma `Course` d'une formule — et ses dates réelles en `CourseInstance`.
 *
 * POURQUOI EN PLUS DE `Service`. Les trois formules étaient décrites comme des
 * services, ce qu'elles sont au sens commercial. Mais un service ne dit rien de
 * ce qu'on y apprend, ni de qui enseigne, ni de quand ça a lieu : ce sont les
 * trois questions qu'on pose d'un cours, et `Course` est le seul type de
 * schema.org qui les porte. « Cours de couture » est par ailleurs la requête
 * même qui mène ici — la décrire avec le vocabulaire du cours, et non celui du
 * prestataire, est la traduction la plus littérale du contenu de la page.
 *
 * LES DATES VIENNENT DE LA BASE, celle qui facture. Les trois pages de formules
 * sont rendues à chaque visite (`prerender = false`), donc une date passée ne
 * peut pas survivre dans le balisage — elle disparaît en même temps qu'elle
 * disparaît de la page. C'est ce qui autorise à les publier : un calendrier
 * figé au build aurait annoncé des séances révolues.
 *
 * SANS DATE PROGRAMMÉE, une seule instance générique porte la durée d'une
 * séance. Elle dit « ce cours a lieu sur place et dure 3 h », ce qui est vrai
 * toute l'année, plutôt que de taire l'existence du cours jusqu'à ce que le
 * calendrier soit arrêté.
 */
export function buildCourseSchema({
  name,
  description,
  pageUrl,
  siteUrl,
  settings,
  seances,
  charge,
  lieuParDefaut,
}: CourseOptions): object {
  const instructeur = {
    "@type": "Person",
    "name": settings?.authorName,
    "jobTitle": settings?.authorJobTitle,
    "url": `${siteUrl}/la-couturiere/`,
  };

  const lieuDe = (nom: string) => ({
    "@type": "Place",
    "name": nom,
    "address": { "@type": "PostalAddress", "addressLocality": nom, "addressCountry": "FR" },
  });

  const datees = seances
    .filter((s) => s.nom.trim().length > 0 && dureeIsoEntre(s.debut, s.fin) !== null)
    /*
     * TRIÉES ICI, et non par la requête qui les a lues.
     *
     * Les trois pages n'ordonnent pas leurs séances de la même façon — celle des
     * ateliers les reçoit groupées par créneau, dans l'ordre où la base les rend.
     * Sans ce tri, la coupe ci-dessous gardait vingt-cinq dates prises au hasard
     * de la saison : le balisage annonçait un jeudi de février quand la prochaine
     * séance était la semaine suivante. Or ce qu'un moteur vient chercher ici,
     * c'est précisément la plus proche.
     */
    .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())
    /*
     * LES VINGT-CINQ PREMIÈRES, et pas la saison entière.
     *
     * Une saison d'ateliers compte quatre-vingt-quatorze séances : les publier
     * toutes ajoutait quarante-sept kilo-octets de JSON-LD dans le `<head>` d'une
     * page rendue à chaque visite, pour un intérêt qui s'épuise bien avant. Ce
     * qu'un moteur cherche ici, c'est la prochaine date, pas la dernière.
     *
     * Rien n'est perdu pour autant : /dates.md porte le calendrier complet, et
     * c'est le fichier fait pour ça.
     */
    .slice(0, 25)
    .map((s) => ({
      "@type": "CourseInstance",
      "name": s.nom,
      "courseMode": "Onsite",
      "courseWorkload": dureeIsoEntre(s.debut, s.fin),
      "startDate": s.debut,
      "endDate": s.fin,
      "location": lieuDe(s.lieu),
      "instructor": instructeur,
      ...(typeof s.prix === 'number' && s.prix > 0
        ? {
            "offers": {
              "@type": "Offer",
              "price": s.prix,
              "priceCurrency": "EUR",
              "category": "Paid",
              "url": pageUrl,
            },
          }
        : {}),
    }));

  const generique = dureeIso(charge);
  const instances = datees.length
    ? datees
    : generique
      ? [{
          "@type": "CourseInstance",
          "courseMode": "Onsite",
          "courseWorkload": generique,
          "instructor": instructeur,
          ...(lieuParDefaut ? { "location": lieuDe(lieuParDefaut) } : {}),
        }]
      : [];

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": name,
    "description": description,
    "url": pageUrl,
    "inLanguage": "fr",
    /*
     * L'IDENTIFIANT ET LE NOM, pas seulement l'identifiant.
     *
     * `#organization` est déclaré sur la page d'accueil, et les schémas de ce
     * site s'y réfèrent d'une page à l'autre — c'est le graphe, et il est juste.
     * Mais un validateur qui n'ouvre que cette page-ci ne peut pas le résoudre,
     * et lit alors un cours sans organisme. Porter le nom en plus ne casse pas
     * le lien : les deux se cumulent, et la fiche se tient toute seule.
     */
    "provider": {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      "name": settings?.siteName,
      "url": siteUrl,
    },
    ...(instances.length ? { "hasCourseInstance": instances } : {}),
  };
}

interface DefinedTermOptions {
  terme: string;
  definition: string;
  pageUrl: string;
  siteUrl: string;
  /** Les autres noms du même geste — « valeur de couture » pour « marge de couture ». */
  synonymes?: readonly string[] | null;
}

/**
 * Le schéma d'une entrée de glossaire : `DefinedTerm` dans son `DefinedTermSet`.
 *
 * POURQUOI PAS `Article`. Un article a un auteur, une date, un fil de lecture ;
 * une définition n'a rien de tout ça et se consulte au milieu d'autre chose.
 * `DefinedTerm` est le type que schema.org réserve exactement à ce cas, et il
 * porte ce qu'aucun autre ne porte : l'appartenance à un ENSEMBLE. Déclarer les
 * quarante fiches comme membres d'un même `DefinedTermSet` dit à un moteur
 * qu'elles forment un lexique et non quarante pages éparses — c'est la
 * différence entre un glossaire et un tas de définitions.
 *
 * `termCode` reçoit le slug : c'est l'identifiant stable du terme, celui qui
 * survit à une reformulation du libellé.
 */
export function buildDefinedTermSchema({
  terme,
  definition,
  pageUrl,
  siteUrl,
  synonymes,
}: DefinedTermOptions): object {
  const autresNoms = (synonymes ?? []).map((s) => s.trim()).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": terme,
    "description": definition,
    "url": pageUrl,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "@id": `${siteUrl}/glossaire/#glossaire`,
      "name": "Glossaire de la couture",
      "url": `${siteUrl}/glossaire/`,
    },
    ...(autresNoms.length ? { "alternateName": autresNoms } : {}),
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
