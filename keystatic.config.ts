import { config, fields, singleton, collection } from '@keystatic/core';

const coverImageField = (slug: string) =>
  fields.image({
    label: 'Image de couverture',
    directory: `src/assets/images/covers/${slug}`,
    publicPath: `/src/assets/images/covers/${slug}/`,
  });

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
      },
    }),
    homepage: singleton({
      label: 'Accueil',
      path: 'src/content/pages/homepage/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField('homepage'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
        youtubeVideoId: fields.text({ label: 'ID vidéo YouTube' }),
        youtubeCredit: fields.text({ label: 'Crédit vidéo' }),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    stagesThematiques: singleton({
      label: 'Stages thématiques',
      path: 'src/content/pages/stages-thematiques/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField('stages-thematiques'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    ateliersReguliers: singleton({
      label: 'Ateliers réguliers',
      path: 'src/content/pages/ateliers-reguliers/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField('ateliers-reguliers'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
        content: fields.markdoc({ label: 'Contenu de la page' }),
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
        coverImage: coverImageField('un-apres-midi-couture'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
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
        coverImage: coverImageField('la-couturiere'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
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
        coverImage: coverImageField('mes-creations'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
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
        coverImage: coverImageField('blog'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
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
        coverImage: coverImageField('mentions-legales'),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
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
