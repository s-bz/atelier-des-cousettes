import { config, fields, singleton, collection } from '@keystatic/core';
import { ATELIER_GROUPS } from './src/utils/ateliers';
import { markdocComponents } from './src/utils/markdoc-components';

const coverImageFields = (slug: string) => ({
  coverImage: fields.image({
    label: 'Image de couverture',
    directory: `src/assets/images/covers/${slug}`,
    publicPath: `/src/assets/images/covers/${slug}/`,
  }),
  coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
});

/**
 * Les questions fréquentes, définies une fois pour les cinq endroits qui en ont.
 *
 * Le même bloc était recopié à l'identique sur chaque page de formule ; le blog
 * en ajoutait un sixième. Un champ recopié se met à diverger — un libellé ici,
 * un `multiline` oublié là — et le rendu comme le schéma JSON-LD dépendent de sa
 * forme exacte.
 */
const faqItemsField = () =>
  fields.array(
    fields.object({
      question: fields.text({ label: 'Question' }),
      answer: fields.text({ label: 'Réponse', multiline: true }),
    }),
    {
      label: 'Questions fréquentes',
      itemLabel: (props) => props.fields.question.value || 'Question',
    },
  );

const schemaOffersField = () =>
  fields.array(
    fields.object({
      name: fields.text({ label: 'Nom' }),
      price: fields.text({
        label: 'Prix (nombre seul, ex: 40)',
        validation: { pattern: { regex: /^\d+(\.\d{1,2})?$/, message: 'Entrer un nombre (ex: 40 ou 25.50)' } },
      }),
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
        googleBusinessUrl: fields.url({ label: 'Google Business Profile URL' }),
        googleReviewUrl: fields.url({ label: 'Lien avis Google (g.page)' }),
        contactFormUrl: fields.url({ label: 'URL formulaire de contact' }),
        address: fields.text({ label: 'Adresse', multiline: true }),
        authorName: fields.text({ label: 'Nom de l\'auteur (schema)' }),
        authorJobTitle: fields.text({ label: 'Titre professionnel (schema)' }),
        streetAddress: fields.text({ label: 'Rue (schema)' }),
        addressLocality: fields.text({ label: 'Ville (schema)' }),
        postalCode: fields.text({ label: 'Code postal (schema)' }),
        addressRegion: fields.text({ label: 'Région (schema)' }),
        defaultCtaLabel: fields.text({ label: 'Libellé CTA par défaut' }),

        /*
         * LE BANDEAU D'AVERTISSEMENT DES TROIS PAGES DE FORMULES.
         *
         * Un seul champ pour les trois : c'est un avis daté, qui doit
         * disparaître d'un coup. Recopié en trois endroits, il en resterait un
         * en ligne des mois après que les tarifs sont arrêtés.
         *
         * Vider le champ retire le bandeau — pas de case à cocher qui puisse
         * rester cochée sur un texte devenu faux.
         */

        avisProvisoire: fields.text({
          label: 'Bandeau d’avertissement (ateliers, stages, séances)',
          description:
            'Affiché en haut des trois pages de formules. Videz ce champ pour le faire disparaître partout.',
          multiline: true,
        }),
      },
    }),
    homepage: singleton({
      label: 'Accueil',
      path: 'src/content/pages/homepage/',
      previewUrl: '/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoTitle: fields.text({
          label: 'Titre SEO (balise <title>, indépendant du titre affiché)',
        }),
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
        blogSectionTitle: fields.text({ label: 'Titre section derniers articles' }),
        actualitesBlogLabel: fields.text({ label: 'Libellé lien vers le blog' }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    stagesThematiques: singleton({
      label: 'Stages thématiques',
      path: 'src/content/pages/stages-thematiques/',
      previewUrl: '/stages-thematiques/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('stages-thematiques'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        stagesSectionTitle: fields.text({ label: 'Titre section stages' }),
        datesLabel: fields.text({ label: 'Libellé « Prochaines dates : »' }),
        faqSectionTitle: fields.text({ label: 'Titre section FAQ' }),
        /*
         * LE CONTENU DÉCRIT LES STAGES ; LA BASE DIT COMBIEN ET QUAND.
         *
         * Prix, durées et dates ont quitté ce formulaire le jour où la page a
         * commencé à les lire en base. Les laisser aurait été pire que les
         * perdre : c'étaient des cases modifiables qui ne changeaient plus
         * rien, et elles contenaient encore les tarifs et les dates de la
         * saison passée. Qui les aurait corrigées y aurait perdu son temps sans
         * jamais le savoir.
         *
         * Le nom fait la jointure avec le créneau en base — c'est le seul
         * identifiant commun. Le renommer ici oblige à le renommer là-bas.
         */
        stages: fields.array(
          fields.object({
            name: fields.text({
              label: 'Nom du stage',
              description: 'Doit correspondre exactement au nom du créneau en base.',
            }),
            shortDescription: fields.text({ label: 'Description courte (carte)', multiline: true }),
            fullDescription: fields.text({ label: 'Description complète', multiline: true }),
            prerequisite: fields.text({ label: 'Pré-requis (optionnel)', multiline: true }),
          }),
          {
            label: 'Stages',
            itemLabel: (props) => props.fields.name.value || 'Stage',
          },
        ),
        faqItems: faqItemsField(),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    ateliersReguliers: singleton({
      label: 'Ateliers réguliers',
      path: 'src/content/pages/ateliers-reguliers/',
      previewUrl: '/ateliers-reguliers/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('ateliers-reguliers'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        creneauxSectionTitle: fields.text({ label: 'Titre section créneaux' }),
        calendarLabel: fields.text({ label: 'Libellé « Calendrier : »' }),
        faqSectionTitle: fields.text({ label: 'Titre section FAQ' }),

        /*
         * LES TARIFS SE DÉCLARENT PAR PUBLIC, ET NON PAR CRÉNEAU.
         *
         * Un forfait s'achète pour la saison et se pose sur les dates de son
         * choix, quel que soit le créneau : le prix ne dépend donc pas du jour
         * mais du public. Le déclarer sept fois, une par créneau, ne le rendait
         * pas plus juste — cela offrait sept occasions de se contredire, et
         * Verdalle en profitait déjà pour annoncer 25 € sur sa carte et 50 €
         * dans son détail.
         *
         * Le prix d'une séance sans engagement ne figure PAS ici : il vit en
         * base, où il sert à facturer les séances hors forfait. Recopié dans le
         * CMS, il aurait dérivé en une saison, et la page aurait promis un
         * montant que l'écran « à facturer » aurait démenti.
         */
        tarifsTitle: fields.text({ label: 'Titre section tarifs' }),
        tarifsLienLabel: fields.text({
          label: 'Lien vers les tarifs, sous l’introduction (ex : Voir les tarifs)',
        }),
        tarifsIntro: fields.text({
          label: 'Phrase au-dessus des tarifs (saison, souplesse, adhésion)',
          multiline: true,
        }),
        tarifsUniteQuestion: fields.text({
          label: 'Amorce de la séance à l’unité (les prix sont ajoutés depuis la base)',
        }),
        tarifsNote: fields.text({ label: 'Note sous les tarifs', multiline: true }),
        tarifs: fields.array(
          fields.object({
            audience: fields.select({
              label: 'Public',
              options: [
                { label: 'Adultes', value: 'adultes' },
                { label: 'Enfants', value: 'enfants' },
              ],
              defaultValue: 'adultes',
            }),
            dureeSeance: fields.text({ label: 'Durée d’une séance (ex : Séances de 3 h)' }),
            formules: fields.array(
              fields.object({
                /*
                 * CE QU'ON ACHÈTE, ET CE QUE ÇA COÛTE — sur la même ligne.
                 *
                 * Le nombre de séances est le produit : c'est lui qu'on compare,
                 * lui qui figure sur le bulletin d'adhésion. L'avoir relégué en
                 * gris sous le prix le rendait introuvable.
                 *
                 * Le rythme reste, mais en glose : « environ une fois par mois »
                 * traduit ce que dix séances veulent dire dans une vie, sans
                 * prétendre à un engagement de calendrier — le forfait se pose
                 * sur les dates de son choix. Le prix comptant l'accompagne :
                 * l'escamoter reviendrait à cacher le total.
                 */
                seances: fields.text({ label: 'Ce qu’on achète (ex : 10 séances)' }),
                mensuel: fields.text({ label: 'Prix mis en avant (ex : 36 € par mois)' }),
                detail: fields.text({
                  label: 'Glose (ex : environ une fois par mois, ou 360 € réglés en une fois)',
                }),
              }),
              {
                label: 'Formules',
                itemLabel: (props) =>
                  `${props.fields.seances.value || 'Formule'} — ${props.fields.mensuel.value || '?'}`,
              },
            ),
          }),
          {
            label: 'Tarifs par public',
            itemLabel: (props) => (props.fields.audience.value === 'enfants' ? 'Enfants' : 'Adultes'),
          },
        ),
        creneaux: fields.array(
          fields.object({
            name: fields.text({ label: 'Nom du créneau' }),
            location: fields.text({ label: 'Lieu (ex: Revel, Verdalle)' }),
            day: fields.text({ label: 'Jour (ex: Jeudi)' }),
            time: fields.text({ label: 'Horaire (ex: 14h à 17h)' }),
            group: fields.select({
              label: 'Groupe (navigation)',
              options: ATELIER_GROUPS.map((g) => ({ label: g.label, value: g.id })),
              defaultValue: ATELIER_GROUPS[0].id,
            }),
            note: fields.text({ label: 'Note (optionnel)', multiline: true }),
          }),
          {
            label: 'Créneaux',
            itemLabel: (props) =>
              `${props.fields.name.value || 'Créneau'} — ${props.fields.location.value || '?'}`,
          },
        ),
        faqItems: faqItemsField(),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        schemaOffers: schemaOffersField(),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    apresMidiCouture: singleton({
      label: 'Un après-midi couture',
      path: 'src/content/pages/seances-sans-engagement/',
      previewUrl: '/seances-sans-engagement/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('seances-sans-engagement'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),

        /*
         * Le tarif et la durée d'une séance viennent de la base : c'est le même
         * montant qui sert à facturer une séance hors forfait, et les horaires
         * du créneau donnent la durée. Les champs qui les recopiaient ici
         * annonçaient encore 40 € et « 3h » pour tout le monde, quand la page
         * affiche 45 € pour un adulte et 35 € pour deux heures d'enfant.
         */
        priceLabel: fields.text({ label: 'Sous-libellé tarif (ex: la séance)' }),
        location: fields.text({ label: 'Lieu', multiline: true }),
        locationLabel: fields.text({ label: 'Sous-libellé lieu (ex: dans le Tarn)' }),
        descriptionTitle: fields.text({ label: 'Titre section description' }),
        description: fields.text({ label: 'Description du déroulement', multiline: true }),
        audienceTitle: fields.text({ label: 'Titre section public' }),
        audienceItems: fields.array(
          fields.text({ label: 'Public cible' }),
          { label: 'À qui s\'adresse cette formule', itemLabel: (props) => props.value || 'Public' },
        ),
        datesTitle: fields.text({ label: 'Titre section dates' }),
        // Les dates elles-mêmes sont lues en base — elles changent trop souvent
        // pour être recopiées, et une date périmée fait se déplacer pour rien.
        datesNote: fields.text({ label: 'Note dates (optionnel)' }),
        lienDates: fields.text({ label: 'Bouton vers les dates (ex : Voir les dates)' }),
        lienDeroulement: fields.text({ label: 'Bouton vers le déroulement (ex : Comment ça se passe)' }),
        faqSectionTitle: fields.text({ label: 'Titre section FAQ' }),
        faqItems: faqItemsField(),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    couturiere: singleton({
      label: 'La couturière',
      path: 'src/content/pages/la-couturiere/',
      previewUrl: '/la-couturiere/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('la-couturiere'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        sections: fields.array(
          fields.object({
            title: fields.text({ label: 'Titre de section' }),
            text: fields.text({ label: 'Texte', multiline: true }),
            image: fields.image({
              label: 'Image (optionnel)',
              directory: 'src/assets/images/couturiere',
              publicPath: '/src/assets/images/couturiere/',
            }),
            imageAlt: fields.text({ label: 'Texte alternatif image' }),
          }),
          {
            label: 'Sections biographie',
            itemLabel: (props) => props.fields.title.value || 'Section',
          },
        ),
        crossLinksSectionTitle: fields.text({ label: 'Titre section liens croisés' }),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    mesCreations: singleton({
      label: 'Mes créations',
      path: 'src/content/pages/mes-creations/',
      previewUrl: '/mes-creations/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('mes-creations'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        gallerySectionTitle: fields.text({ label: 'Titre section galerie' }),
        emptyGalleryText: fields.text({ label: 'Texte galerie vide' }),
        missingImageText: fields.text({ label: 'Texte image manquante' }),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    blogIndex: singleton({
      label: 'Page blog',
      path: 'src/content/pages/blog/',
      previewUrl: '/blog/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('blog'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        ctaText: fields.text({ label: 'Texte d\'accroche CTA', multiline: true }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
        readMoreLabel: fields.text({ label: 'Libellé « Lire l\'article »' }),
        relatedTitle: fields.text({ label: 'Titre « Articles connexes »' }),
        // Le titre de la FAQ des articles : un seul pour les vingt-deux, comme
        // « Articles connexes » juste au-dessus. Le porter par article
        // reviendrait à le ressaisir vingt-deux fois pour lire la même chose.
        faqSectionTitle: fields.text({ label: 'Titre section FAQ des articles' }),
        backToListLabel: fields.text({ label: 'Libellé « Retour à la liste »' }),
        emptyStateText: fields.text({ label: 'Texte aucun article' }),
      },
    }),
    contact: singleton({
      label: 'Contact',
      path: 'src/content/pages/contact/',
      previewUrl: '/contact/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('contact'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
      },
    }),
    mentionsLegales: singleton({
      label: 'Mentions légales',
      path: 'src/content/pages/mentions-legales/',
      previewUrl: '/mentions-legales/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('mentions-legales'),
        content: fields.markdoc({ label: 'Contenu', components: markdocComponents }),
      },
    }),
    confidentialite: singleton({
      label: 'Politique de confidentialité',
      path: 'src/content/pages/confidentialite/',
      previewUrl: '/confidentialite/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('confidentialite'),
        content: fields.markdoc({ label: 'Contenu', components: markdocComponents }),
      },
    }),
  },
  collections: {
    blog: collection({
      label: 'Articles de blog',
      slugField: 'title',
      path: 'src/content/blog/*/',
      previewUrl: '/blog/{slug}/',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Titre' } }),
        publishDate: fields.date({ label: 'Date de publication' }),
        lastModified: fields.date({ label: 'Date de dernière modification (optionnel)' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        coverImage: fields.image({
          label: 'Image de couverture',
          directory: 'src/assets/images/blog',
          publicPath: '/src/assets/images/blog/',
        }),
        coverImageAlt: fields.text({ label: 'Texte alternatif image de couverture' }),
        content: fields.markdoc({ label: 'Contenu', components: markdocComponents }),

        /*
         * CE QUE LES MOTEURS DE RÉPONSE SAVENT EXTRAIRE D'UN ARTICLE.
         *
         * Les trois pages de formules portent une FAQ depuis longtemps, et c'est
         * elle qui les fait citer : une question posée comme un visiteur la
         * pose, une réponse qui tient seule, hors du paragraphe qui l'entoure.
         * Les vingt-deux articles du blog — le gros du site — n'en avaient
         * aucune, et rien à extraire qu'un texte suivi.
         *
         * Les deux champs sont FACULTATIFS et le resteront. Un article sans
         * question ne porte pas de FAQ, un article qui n'explique pas un geste
         * ne porte pas d'étapes ; leur schéma JSON-LD ne paraît que rempli.
         * Un bloc vide vaudrait un balisage mensonger, que Google sanctionne.
         */
        faqItems: faqItemsField(),
        howToSteps: fields.array(
          fields.object({
            name: fields.text({ label: 'Titre de l’étape' }),
            text: fields.text({ label: 'Description de l’étape', multiline: true }),
          }),
          {
            label: 'Étapes (tutoriels) — laisser vide si l’article n’en est pas un',
            description:
              'À ne remplir que si l’article explique une réalisation pas à pas. Les étapes doivent reprendre celles du texte, pas les remplacer.',
            itemLabel: (props) => props.fields.name.value || 'Étape',
          },
        ),
        howToDuree: fields.text({
          label: 'Durée totale (ex : 2 h) — facultatif, pour les tutoriels',
        }),
        howToFournitures: fields.array(fields.text({ label: 'Fourniture' }), {
          label: 'Fournitures nécessaires (tutoriels)',
          itemLabel: (props) => props.value || 'Fourniture',
        }),
      },
    }),
    creations: collection({
      label: 'Créations',
      slugField: 'title',
      path: 'src/content/creations/*',
      previewUrl: '/mes-creations/',
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
        order: fields.integer({ label: "Ordre d'affichage", defaultValue: 0, validation: { min: 0 } }),
      },
    }),
  },
});
