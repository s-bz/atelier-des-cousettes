import { config, fields, singleton, collection } from '@keystatic/core';

const coverImageField = () =>
  fields.image({
    label: 'Image de couverture',
    directory: 'src/assets/images/covers',
    publicPath: '/src/assets/images/covers/',
  });

export default config({
  storage: { kind: 'local' },
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
        coverImage: coverImageField(),
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
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField(),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    ateliersReguliers: singleton({
      label: 'Ateliers réguliers',
      path: 'src/content/pages/ateliers-reguliers/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField(),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    apresMidiCouture: singleton({
      label: 'Un après midi couture',
      path: 'src/content/pages/un-apres-midi-couture/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField(),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    couturiere: singleton({
      label: 'La couturière',
      path: 'src/content/pages/la-couturiere/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField(),
        content: fields.markdoc({ label: 'Contenu de la page' }),
      },
    }),
    mentionsLegales: singleton({
      label: 'Mentions légales',
      path: 'src/content/pages/mentions-legales/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: coverImageField(),
        content: fields.markdoc({ label: 'Contenu' }),
      },
    }),
  },
  collections: {
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
