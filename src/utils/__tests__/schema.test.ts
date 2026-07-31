import { describe, it, expect } from 'vitest';
import {
  buildBreadcrumbSchema,
  buildCourseSchema,
  buildFaqSchema,
  buildHowToSchema,
  buildPageSchemas,
  buildServicePageSchemas,
  dureeIso,
} from '../schema';

describe('buildBreadcrumbSchema', () => {
  it('creates a BreadcrumbList with correct positions starting at 1', () => {
    const schema = buildBreadcrumbSchema([
      { name: 'Accueil', url: 'https://example.com' },
      { name: 'Blog', url: 'https://example.com/blog' },
      { name: 'Mon article' },
    ]) as any;

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
    expect(schema.itemListElement[2].position).toBe(3);
  });

  it('includes "item" URL only when provided', () => {
    const schema = buildBreadcrumbSchema([
      { name: 'Accueil', url: 'https://example.com' },
      { name: 'Page courante' },
    ]) as any;

    expect(schema.itemListElement[0].item).toBe('https://example.com');
    expect(schema.itemListElement[1]).not.toHaveProperty('item');
  });

  it('handles single item', () => {
    const schema = buildBreadcrumbSchema([{ name: 'Accueil' }]) as any;
    expect(schema.itemListElement).toHaveLength(1);
    expect(schema.itemListElement[0].position).toBe(1);
  });

  it('handles empty array', () => {
    const schema = buildBreadcrumbSchema([]) as any;
    expect(schema.itemListElement).toEqual([]);
  });
});

const baseSettings = {
  authorName: 'Isabelle Bultez',
  authorJobTitle: 'Couturière diplômée CAP',
  facebookUrl: 'https://facebook.com/test',
};

describe('buildPageSchemas', () => {
  it('returns BreadcrumbList and WebPage schemas', () => {
    const schemas = buildPageSchemas({
      title: 'Test',
      seoDescription: 'Description',
      pageUrl: 'https://example.com/test',
      siteUrl: 'https://example.com',
      settings: { ...baseSettings, siteName: "L'Atelier des Cousettes" },
    });

    expect(schemas).toHaveLength(2);
    expect((schemas[0] as any)['@type']).toBe('BreadcrumbList');
    expect((schemas[1] as any)['@type']).toBe('WebPage');
  });

  it('handles null settings gracefully', () => {
    const schemas = buildPageSchemas({
      title: 'Test',
      seoDescription: 'Desc',
      pageUrl: 'https://example.com/test',
      siteUrl: 'https://example.com',
      settings: null,
    });

    const webPage = schemas[1] as any;
    expect(webPage.author.name).toBeUndefined();
    expect(webPage.author.sameAs).toEqual([]);
  });
});

describe('buildServicePageSchemas', () => {
  const baseOptions = {
    title: 'Ateliers',
    seoDescription: 'Desc',
    pageUrl: 'https://example.com/ateliers',
    siteUrl: 'https://example.com',
    settings: { ...baseSettings, siteName: "L'Atelier des Cousettes" },
  };

  it('includes Service schema with parsed numeric prices', () => {
    const schemas = buildServicePageSchemas({
      ...baseOptions,
      offers: [{ name: 'Cours', price: '25.50' }],
      faqItems: [],
    });

    const service = schemas.find((s: any) => s['@type'] === 'Service') as any;
    expect(service).toBeDefined();
    expect(service.offers[0].price).toBe(25.5);
    expect(service.offers[0].priceCurrency).toBe('EUR');
  });

  it('defaults price to 0 for non-numeric values', () => {
    const schemas = buildServicePageSchemas({
      ...baseOptions,
      offers: [{ name: 'Gratuit', price: 'gratuit' }],
      faqItems: [],
    });

    const service = schemas.find((s: any) => s['@type'] === 'Service') as any;
    expect(service.offers[0].price).toBe(0);
  });

  it('includes FAQPage when valid FAQ items exist', () => {
    const schemas = buildServicePageSchemas({
      ...baseOptions,
      offers: [],
      faqItems: [
        { question: 'Quoi ?', answer: 'Cela.' },
      ],
    });

    const faq = schemas.find((s: any) => s['@type'] === 'FAQPage') as any;
    expect(faq).toBeDefined();
    expect(faq.mainEntity).toHaveLength(1);
    expect(faq.mainEntity[0].name).toBe('Quoi ?');
  });

  it('excludes FAQPage when all FAQ items are empty', () => {
    const schemas = buildServicePageSchemas({
      ...baseOptions,
      offers: [],
      faqItems: [
        { question: '', answer: '' },
        { question: '  ', answer: 'Non vide' },
      ],
    });

    const faq = schemas.find((s: any) => s['@type'] === 'FAQPage');
    expect(faq).toBeUndefined();
  });

  it('excludes FAQPage when faqItems is empty', () => {
    const schemas = buildServicePageSchemas({
      ...baseOptions,
      offers: [],
      faqItems: [],
    });

    const faq = schemas.find((s: any) => s['@type'] === 'FAQPage');
    expect(faq).toBeUndefined();
  });

  it('filters out invalid FAQ items from mainEntity', () => {
    const schemas = buildServicePageSchemas({
      ...baseOptions,
      offers: [],
      faqItems: [
        { question: 'Valide ?', answer: 'Oui.' },
        { question: '', answer: 'réponse orpheline' },
        { question: 'question orpheline', answer: '' },
      ],
    });

    const faq = schemas.find((s: any) => s['@type'] === 'FAQPage') as any;
    expect(faq.mainEntity).toHaveLength(1);
    expect(faq.mainEntity[0].name).toBe('Valide ?');
  });
});

describe('dureeIso', () => {
  it('convertit les durées écrites en français', () => {
    expect(dureeIso('2 h')).toBe('PT2H');
    expect(dureeIso('2 h 30')).toBe('PT2H30M');
    expect(dureeIso('45 min')).toBe('PT45M');
    expect(dureeIso('1h15')).toBe('PT1H15M');
  });

  it('renvoie null quand aucune durée n’est lisible', () => {
    expect(dureeIso(null)).toBeNull();
    expect(dureeIso('')).toBeNull();
    expect(dureeIso('une petite heure')).toBeNull();
  });
});

describe('buildFaqSchema', () => {
  it('construit un FAQPage à partir des questions valides', () => {
    const faq = buildFaqSchema([{ question: 'Quoi ?', answer: 'Cela.' }]) as any;
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity).toHaveLength(1);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('Cela.');
  });

  it('écarte les questions incomplètes', () => {
    const faq = buildFaqSchema([
      { question: 'Valide ?', answer: 'Oui.' },
      { question: '  ', answer: 'orpheline' },
      { question: 'orpheline', answer: '' },
    ]) as any;
    expect(faq.mainEntity).toHaveLength(1);
  });

  it('renvoie null plutôt qu’un FAQPage vide', () => {
    expect(buildFaqSchema([])).toBeNull();
    expect(buildFaqSchema([{ question: '', answer: '' }])).toBeNull();
  });

  it('déclare speakable sur les deux classes que la page porte', () => {
    const faq = buildFaqSchema([{ question: 'Q', answer: 'R' }]) as any;
    expect(faq.speakable.cssSelector).toEqual(['.faq-question', '.faq-answer']);
  });
});

describe('buildHowToSchema', () => {
  const base = {
    name: 'Coudre un tote bag',
    description: 'Les étapes clés.',
    pageUrl: 'https://example.com/blog/coudre-tote-bag/',
  };

  it('numérote les étapes à partir de 1', () => {
    const howTo = buildHowToSchema({
      ...base,
      steps: [
        { name: 'Couper', text: 'Couper deux rectangles.' },
        { name: 'Assembler', text: 'Coudre les côtés.' },
      ],
    }) as any;

    expect(howTo['@type']).toBe('HowTo');
    expect(howTo.step).toHaveLength(2);
    expect(howTo.step[0].position).toBe(1);
    expect(howTo.step[1].position).toBe(2);
  });

  it('renvoie null sans étape — un HowTo vide serait un balisage trompeur', () => {
    expect(buildHowToSchema({ ...base, steps: [] })).toBeNull();
    expect(buildHowToSchema({ ...base, steps: [{ name: '', text: '' }] })).toBeNull();
  });

  it('écarte les étapes incomplètes', () => {
    const howTo = buildHowToSchema({
      ...base,
      steps: [
        { name: 'Couper', text: 'Couper deux rectangles.' },
        { name: 'Sans texte', text: '   ' },
      ],
    }) as any;
    expect(howTo.step).toHaveLength(1);
  });

  it('omet durée et fournitures quand elles ne sont pas renseignées', () => {
    const howTo = buildHowToSchema({
      ...base,
      steps: [{ name: 'Couper', text: 'Couper.' }],
      duree: null,
      fournitures: [],
    }) as any;
    expect(howTo).not.toHaveProperty('totalTime');
    expect(howTo).not.toHaveProperty('supply');
  });

  it('porte la durée en ISO 8601 et les fournitures', () => {
    const howTo = buildHowToSchema({
      ...base,
      steps: [{ name: 'Couper', text: 'Couper.' }],
      duree: '1 h 30',
      fournitures: ['Coton, 50 cm', '  ', 'Fil assorti'],
    }) as any;
    expect(howTo.totalTime).toBe('PT1H30M');
    expect(howTo.supply).toHaveLength(2);
    expect(howTo.supply[0]).toEqual({ '@type': 'HowToSupply', name: 'Coton, 50 cm' });
  });
});

describe('buildCourseSchema', () => {
  const base = {
    name: 'Ateliers réguliers',
    description: 'Un forfait de séances sur la saison.',
    pageUrl: 'https://example.com/ateliers-reguliers/',
    siteUrl: 'https://example.com',
    settings: { ...baseSettings, siteName: "L'Atelier des Cousettes" },
  };

  const seances = [
    { nom: 'Atelier du mardi après-midi', debut: '2026-09-15T12:00:00+00:00', fin: '2026-09-15T15:00:00+00:00', lieu: 'Revel', prix: 45 },
    { nom: 'Atelier de Verdalle', debut: '2026-09-10T07:30:00+00:00', fin: '2026-09-10T10:00:00+00:00', lieu: 'Verdalle', prix: 45 },
  ];

  it('rattache le cours à l’organisation par son identifiant, non par une copie', () => {
    const course = buildCourseSchema({ ...base, seances }) as any;
    expect(course['@type']).toBe('Course');
    expect(course.provider).toEqual({
      '@type': 'Organization',
      '@id': 'https://example.com/#organization',
      name: "L'Atelier des Cousettes",
      url: 'https://example.com',
    });
    expect(course.inLanguage).toBe('fr');
  });

  it('publie une instance par date, avec sa durée réelle et son lieu', () => {
    const course = buildCourseSchema({ ...base, seances }) as any;
    expect(course.hasCourseInstance).toHaveLength(2);

    // Verdalle d'abord : les instances sortent par date, non dans l'ordre reçu.
    const [verdalle, mardi] = course.hasCourseInstance;
    expect(mardi.courseWorkload).toBe('PT3H');
    expect(mardi.courseMode).toBe('Onsite');
    expect(mardi.startDate).toBe('2026-09-15T12:00:00+00:00');
    expect(mardi.location.name).toBe('Revel');
    expect(mardi.offers).toMatchObject({ price: 45, priceCurrency: 'EUR', category: 'Paid' });
    // 2 h 30 : la durée se calcule, elle ne se recopie pas d'un créneau à l'autre.
    expect(verdalle.courseWorkload).toBe('PT2H30M');
  });

  it('nomme l’enseignante sur chaque instance', () => {
    const course = buildCourseSchema({ ...base, seances }) as any;
    expect(course.hasCourseInstance[0].instructor).toMatchObject({
      '@type': 'Person',
      name: 'Isabelle Bultez',
      jobTitle: 'Couturière diplômée CAP',
    });
  });

  it('écarte une séance dont les horaires sont incohérents', () => {
    const course = buildCourseSchema({
      ...base,
      seances: [
        ...seances,
        { nom: 'Séance à l’envers', debut: '2026-09-20T15:00:00+00:00', fin: '2026-09-20T12:00:00+00:00', lieu: 'Revel', prix: 45 },
        { nom: '  ', debut: '2026-09-21T12:00:00+00:00', fin: '2026-09-21T15:00:00+00:00', lieu: 'Revel', prix: 45 },
      ],
    }) as any;
    expect(course.hasCourseInstance).toHaveLength(2);
  });

  it('omet le prix d’une séance que la base ne tarife pas', () => {
    const course = buildCourseSchema({
      ...base,
      seances: [{ nom: 'Atelier', debut: '2026-09-15T12:00:00+00:00', fin: '2026-09-15T15:00:00+00:00', lieu: 'Revel', prix: null }],
    }) as any;
    expect(course.hasCourseInstance[0]).not.toHaveProperty('offers');
  });

  it('retombe sur une instance générique quand aucune date n’est programmée', () => {
    const course = buildCourseSchema({
      ...base,
      seances: [],
      charge: 'Séances de 3 h',
      lieuParDefaut: 'Revel',
    }) as any;
    expect(course.hasCourseInstance).toHaveLength(1);
    expect(course.hasCourseInstance[0]).not.toHaveProperty('startDate');
    expect(course.hasCourseInstance[0].courseWorkload).toBe('PT3H');
    expect(course.hasCourseInstance[0].location.name).toBe('Revel');
  });

  it('n’annonce aucune instance quand ni date ni durée ne sont connues', () => {
    const course = buildCourseSchema({ ...base, seances: [], charge: null }) as any;
    expect(course).not.toHaveProperty('hasCourseInstance');
  });

  it('publie les dates dans l’ordre, quel que soit celui de la base', () => {
    const desordre = [
      { nom: 'Février', debut: '2027-02-18T12:00:00+00:00', fin: '2027-02-18T15:00:00+00:00', lieu: 'Revel', prix: 45 },
      { nom: 'Septembre', debut: '2026-09-15T12:00:00+00:00', fin: '2026-09-15T15:00:00+00:00', lieu: 'Revel', prix: 45 },
      { nom: 'Novembre', debut: '2026-11-03T12:00:00+00:00', fin: '2026-11-03T15:00:00+00:00', lieu: 'Revel', prix: 45 },
    ];
    const course = buildCourseSchema({ ...base, seances: desordre }) as any;
    expect(course.hasCourseInstance.map((i: any) => i.name)).toEqual(['Septembre', 'Novembre', 'Février']);
  });

  it('garde les vingt-cinq dates les plus proches, non vingt-cinq au hasard', () => {
    const saison = Array.from({ length: 40 }, (_, i) => ({
      nom: `S${i}`,
      // À rebours : la plus lointaine est lue en premier, comme peut le faire la base.
      debut: `2026-${String(12 - Math.floor(i / 4)).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}T12:00:00+00:00`,
      fin: `2026-${String(12 - Math.floor(i / 4)).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}T15:00:00+00:00`,
      lieu: 'Revel',
      prix: 45,
    }));
    const course = buildCourseSchema({ ...base, seances: saison }) as any;
    const dates = course.hasCourseInstance.map((i: any) => i.startDate);
    expect(dates).toEqual([...dates].sort());
    // La plus lointaine de la saison ne peut pas figurer dans les vingt-cinq plus proches.
    const plusLointaine = [...saison].sort((a, b) => b.debut.localeCompare(a.debut))[0].debut;
    expect(dates).not.toContain(plusLointaine);
  });

  it('s’arrête à vingt-cinq instances — la saison entière alourdirait la page', () => {
    const saison = Array.from({ length: 94 }, (_, i) => ({
      nom: 'Atelier du mardi après-midi',
      debut: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T12:00:00+00:00`,
      fin: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T15:00:00+00:00`,
      lieu: 'Revel',
      prix: 45,
    }));
    const course = buildCourseSchema({ ...base, seances: saison }) as any;
    expect(course.hasCourseInstance).toHaveLength(25);
  });
});
