import { describe, it, expect } from 'vitest';
import { buildBreadcrumbSchema, buildPageSchemas, buildServicePageSchemas } from '../schema';

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
      settings: baseSettings,
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
    settings: baseSettings,
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
