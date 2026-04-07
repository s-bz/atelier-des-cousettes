import { config, fields, singleton, collection } from '@keystatic/core';

const coverImageFields = (slug: string) => ({
  coverImage: fields.image({
    label: 'Image de couverture',
    directory: `src/assets/images/covers/${slug}`,
    publicPath: `/src/assets/images/covers/${slug}/`,
  }),
  coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
});

const schemaOffersField = () =>
  fields.array(
    fields.object({
      name: fields.text({ label: 'Nom' }),
      price: fields.text({ label: 'Prix (en €)' }),
    }),
    {
      label: 'Offres (schema SEO)',
      itemLabel: (props) =>
        `${props.fields.name.value || 'Offre'} — ${props.fields.price.value || '?'}€`,
    },
  );

export default config({
  storage: import.meta.env.DEV
    ? { kind: 'local' }
    : { kind: 'github', repo: 's-bz/atelier-des-cousettes' },
  singletons: {
    siteSettings: singleton({
      label: 'Paramètres du site',
      path: 'src/content/site-settings',
      schema: {
        siteName: fields.text({ label: 'Nom du site' }),
        email: fields.text({ label: 'Email' }),
        phones: fields.array(fields.text({ label: 'Numéro' }), {
          label: 'Téléphones',
          itemLabel: (props) => props.value,
        }),
        facebookUrl: fields.url({ label: 'Facebook URL' }),
        contactFormUrl: fields.url({ label: 'URL formulaire de contact' }),
        address: fields.text({ label: 'Adresse', multiline: true }),
        authorName: fields.text({ label: 'Nom de l\'auteur (schema)' }),
        authorJobTitle: fields.text({ label: 'Titre professionnel (schema)' }),
        streetAddress: fields.text({ label: 'Rue (schema)' }),
        addressLocality: fields.text({ label: 'Ville (schema)' }),
        postalCode: fields.text({ label: 'Code postal (schema)' }),
        addressRegion: fields.text({ label: 'Région (schema)' }),
      },
    }),
    homepage: singleton({
      label: 'Accueil',
      path: 'src/content/pages/homepage/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('homepage'),
        introductionTitle: fields.text({ label: 'Titre section introduction' }),
        introduction: fields.text({ label: 'Introduction (paragraphe 1)', multiline: true }),
        introduction2: fields.text({ label: 'Introduction (paragraphe 2)', multiline: true }),
        serviceCards: fields.array(
          fields.object({
            label: fields.text({ label: 'Libellé' }),
            href: fields.text({ label: 'Lien (ex: /ateliers-reguliers)' }),
            image: fields.image({
              label: 'Image',
              directory: 'src/assets/images/homepage',
              publicPath: '/src/assets/images/homepage/',
            }),
            imageAlt: fields.text({ label: 'Texte alternatif image' }),
            priceRange: fields.text({ label: 'Fourchette de prix (ex: Dès 25 €/mois)' }),
            shortDescription: fields.text({ label: 'Description courte', multiline: true }),
          }),
          {
            label: 'Cartes services',
            itemLabel: (props) => props.fields.label.value || 'Carte',
          },
        ),
        valuePropositionsTitle: fields.text({ label: 'Titre section « Pourquoi nous choisir »' }),
        valuePropositions: fields.array(
          fields.object({
            title: fields.text({ label: 'Titre' }),
            description: fields.text({ label: 'Description', multiline: true }),
          }),
          {
            label: 'Avantages',
            itemLabel: (props) => props.fields.title.value || 'Avantage',
          },
        ),
        animatriceTitle: fields.text({ label: 'Titre section animatrice' }),
        animatriceText: fields.text({ label: 'Présentation courte', multiline: true }),
        animatriceImage: fields.image({
          label: 'Photo animatrice',
          directory: 'src/assets/images/homepage',
          publicPath: '/src/assets/images/homepage/',
        }),
        animatriceImageAlt: fields.text({ label: 'Texte alternatif photo animatrice' }),
        animatriceLinkLabel: fields.text({ label: 'Libellé lien vers page couturière' }),
        youtubeTitle: fields.text({ label: 'Titre section vidéo' }),
        youtubeVideoId: fields.text({ label: 'ID vidéo YouTube' }),
        youtubeDescription: fields.text({ label: 'Texte d\'accompagnement vidéo', multiline: true }),
        youtubeCredit: fields.text({ label: 'Crédit vidéo' }),
        actualitesTitle: fields.text({ label: 'Titre section actualités' }),
        actualitesContent: fields.markdoc({ label: 'Contenu actualités' }),
        blogSectionTitle: fields.text({ label: 'Titre section derniers articles' }),
        actualitesBlogLabel: fields.text({ label: 'Libellé lien vers le blog' }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    stagesThematiques: singleton({
      label: 'Stages thématiques',
      path: 'src/content/pages/stages-thematiques/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('stages-thematiques'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        stagesSectionTitle: fields.text({ label: 'Titre section stages' }),
        faqSectionTitle: fields.text({ label: 'Titre section FAQ' }),
        stages: fields.array(
          fields.object({
            name: fields.text({ label: 'Nom du stage' }),
            price: fields.text({ label: 'Prix (ex: 40 € ou 40 €–90 €)' }),
            duration: fields.text({ label: 'Durée (ex: 3h)' }),
            shortDescription: fields.text({ label: 'Description courte (carte)', multiline: true }),
            fullDescription: fields.text({ label: 'Description complète', multiline: true }),
            dates: fields.text({ label: 'Prochaines dates', multiline: true }),
            prerequisite: fields.text({ label: 'Pré-requis (optionnel)', multiline: true }),
          }),
          {
            label: 'Stages',
            itemLabel: (props) =>
              `${props.fields.name.value || 'Stage'} — ${props.fields.price.value || '?'}`,
          },
        ),
        faqItems: fields.array(
          fields.object({
            question: fields.text({ label: 'Question' }),
            answer: fields.text({ label: 'Réponse', multiline: true }),
          }),
          {
            label: 'Questions fréquentes',
            itemLabel: (props) => props.fields.question.value || 'Question',
          },
        ),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        schemaOffers: schemaOffersField(),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    ateliersReguliers: singleton({
      label: 'Ateliers réguliers',
      path: 'src/content/pages/ateliers-reguliers/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('ateliers-reguliers'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        creneauxSectionTitle: fields.text({ label: 'Titre section créneaux' }),
        faqSectionTitle: fields.text({ label: 'Titre section FAQ' }),
        creneaux: fields.array(
          fields.object({
            name: fields.text({ label: 'Nom du créneau' }),
            location: fields.text({ label: 'Lieu (ex: Revel, Verdalle)' }),
            day: fields.text({ label: 'Jour (ex: Jeudi)' }),
            time: fields.text({ label: 'Horaire (ex: 14h à 17h)' }),
            group: fields.select({
              label: 'Groupe (navigation)',
              options: [
                { label: 'Revel — Adultes', value: 'revel-adultes' },
                { label: 'Revel — Enfants', value: 'revel-enfants' },
                { label: 'Verdalle', value: 'verdalle' },
              ],
              defaultValue: 'revel-adultes',
            }),
            price: fields.text({ label: 'Tarif résumé (ex: 55 €/mois)' }),
            priceDetails: fields.text({ label: 'Détail tarifaire', multiline: true }),
            dates: fields.text({ label: 'Calendrier de la saison', multiline: true }),
            note: fields.text({ label: 'Note (optionnel)', multiline: true }),
          }),
          {
            label: 'Créneaux',
            itemLabel: (props) =>
              `${props.fields.name.value || 'Créneau'} — ${props.fields.location.value || '?'}`,
          },
        ),
        faqItems: fields.array(
          fields.object({
            question: fields.text({ label: 'Question' }),
            answer: fields.text({ label: 'Réponse', multiline: true }),
          }),
          {
            label: 'Questions fréquentes',
            itemLabel: (props) => props.fields.question.value || 'Question',
          },
        ),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        schemaOffers: schemaOffersField(),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    apresMidiCouture: singleton({
      label: 'Un après midi couture',
      path: 'src/content/pages/un-apres-midi-couture/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('un-apres-midi-couture'),
        schemaOffers: schemaOffersField(),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    couturiere: singleton({
      label: 'La couturière',
      path: 'src/content/pages/la-couturiere/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('la-couturiere'),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    mesCreations: singleton({
      label: 'Mes créations',
      path: 'src/content/pages/mes-creations/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('mes-creations'),
        content: fields.markdoc({ label: 'Contenu' }),
      },
    }),
    blogIndex: singleton({
      label: 'Page blog',
      path: 'src/content/pages/blog/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('blog'),
      },
    }),
    mentionsLegales: singleton({
      label: 'Mentions légales',
      path: 'src/content/pages/mentions-legales/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('mentions-legales'),
        content: fields.markdoc({ label: 'Contenu' }),
      },
    }),
  },
  collections: {
    blog: collection({
      label: 'Articles de blog',
      slugField: 'title',
      path: 'src/content/blog/*/',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Titre' } }),
        publishDate: fields.date({ label: 'Date de publication' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: fields.image({
          label: 'Image de couverture',
          directory: 'src/assets/images/blog',
          publicPath: '/src/assets/images/blog/',
        }),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
        content: fields.markdoc({ label: 'Contenu' }),
      },
    }),
    creations: collection({
      label: 'Créations',
      slugField: 'title',
      path: 'src/content/creations/*',
      schema: {
        title: fields.slug({ name: { label: 'Titre' } }),
        image: fields.image({
          label: 'Image',
          directory: 'src/assets/images/creations',
          publicPath: '/src/assets/images/creations/',
        }),
        imageAlt: fields.text({ label: 'Texte alternatif' }),
        category: fields.select({
          label: 'Catégorie',
          options: [
            { label: 'Robes', value: 'robes' },
            { label: 'Chapeaux', value: 'chapeaux' },
            { label: 'Accessoires', value: 'accessoires' },
            { label: 'Vêtements', value: 'vetements' },
            { label: 'Autre', value: 'autre' },
          ],
          defaultValue: 'autre',
        }),
        order: fields.integer({ label: "Ordre d'affichage", defaultValue: 0 }),
      },
    }),
  },
});
