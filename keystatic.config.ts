import { config, fields, singleton, collection } from '@keystatic/core';
import { ATELIER_GROUPS, AUDIENCES } from './src/utils/ateliers';
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
        /*
         * LE NUMÉRO WHATSAPP, SÉPARÉ DE LA LISTE DES TÉLÉPHONES.
         *
         * Les deux numéros ci-dessus ne se valent pas : le fixe ne reçoit pas
         * WhatsApp. Deviner « le premier de la liste » marcherait aujourd'hui et
         * casserait le jour où l'ordre change. Un champ à part, vide par défaut
         * si le compte disparaît, retire le lien sans toucher au code.
         */
        whatsappNumber: fields.text({
          label: 'Numéro WhatsApp — vide pour masquer',
          description:
            'Format français (06.95.78.36.34) ou international (+33 6 95 78 36 34). Le lien wa.me est construit automatiquement.',
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
         * LE BOUTON DE LA BARRE DE NAVIGATION, ET SON LIBELLÉ À PART.
         *
         * Court, parce qu'il partage une ligne avec six liens : « Demande
         * d'information » y tiendrait sur deux lignes et pousserait la
         * navigation au repli plus tôt qu'aujourd'hui. C'est la seule raison
         * pour laquelle il ne réutilise pas le libellé par défaut.
         *
         * Vide, le bouton disparaît — de la barre comme du menu replié.
         */
        headerCtaLabel: fields.text({
          label: 'Bouton de la barre de navigation — vide pour masquer',
          description: 'Deux mots au plus : il partage sa ligne avec les liens du menu.',
        }),

        /*
         * CE QU'ANNONCE L'ICÔNE DE TÉLÉPHONE aux lecteurs d'écran.
         *
         * L'icône ne porte aucun texte visible — il n'y a pas la place à côté du
         * menu replié. Sans cette phrase, un lecteur d'écran n'annoncerait que
         * le numéro, sans dire ce qu'on en fait.
         */
        headerPhoneLabel: fields.text({
          label: 'Texte de l’icône téléphone (lecteurs d’écran)',
          description: 'Le numéro est ajouté automatiquement à la suite.',
        }),

        /*
         * LA NOTE GOOGLE, RECOPIÉE ET NON LUE EN DIRECT.
         *
         * L'API Places la donnerait à la requête, au prix d'une clé, d'un quota
         * et d'une facture pour un chiffre qui change deux fois l'an. Un champ
         * suffit — à la condition qu'il soit facile à corriger, d'où sa place
         * ici plutôt que dans le code.
         *
         * Laisser la note vide masque le bandeau : mieux vaut rien qu'un 5,0
         * devenu 4,2. Le NOMBRE d'avis n'est pas affiché, donc pas demandé :
         * « 6 avis » dit surtout qu'ils sont peu nombreux, là où « 5,0 sur
         * Google » dit qu'ils sont bons.
         */
        googleNote: fields.text({
          label: 'Note Google (ex : 5,0) — vide pour masquer',
        }),

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

        /*
         * L'ADHÉSION À L'ASSOCIATION — DEUX MONTANTS, DEUX RÉGIMES.
         *
         * Ils n'étaient écrits nulle part, et c'est ce qui a permis à la phrase
         * « l'adhésion est comprise : il n'y a rien à régler en plus » de
         * s'étendre à des formules où elle est fausse. Un fait que personne ne
         * détient finit par être affirmé de mémoire.
         *
         *   — ANNUELLE, pour un forfait de saison. Elle s'ajoute au forfait :
         *     les montants de la grille ne la contiennent pas.
         *   — PONCTUELLE, pour un stage ou une séance sans engagement. Elle est
         *     COMPRISE dans le prix affiché depuis juillet 2026, où stages et
         *     séances ont été augmentés d'autant (migrations 20260730112806 et
         *     20260730144328). Rien à régler sur place.
         *
         * Vider l'un des deux retire la mention correspondante partout, plutôt
         * que d'afficher « 0 € ».
         */
        adhesionAnnuelle: fields.text({
          label: 'Adhésion annuelle, en plus du forfait (ex : 15 € par an)',
          description:
            'S’AJOUTE aux forfaits de saison. Videz ce champ si l’adhésion est comprise dans les forfaits.',
        }),
        adhesionPonctuelle: fields.text({
          label: 'Adhésion ponctuelle, comprise dans les stages et séances (ex : 5 €)',
          description:
            'DÉJÀ COMPRISE dans les prix des stages et des séances sans engagement. Sert seulement à l’expliquer.',
        }),
      },
    }),
    homepage: singleton({
      label: 'Accueil',
      path: 'src/content/pages/homepage/',
      previewUrl: '/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        /*
         * LE TITRE AFFICHÉ, DISTINCT DU NOM DE L'ENTREPRISE.
         *
         * `title` sert de raison sociale : il nomme l'atelier dans le schéma
         * LocalBusiness, dans le catalogue d'offres et sur la vidéo. Le grand
         * titre de la page d'accueil, lui, n'a pas à répéter une marque que la
         * barre de navigation affiche déjà trois centimètres plus haut — il a
         * une seconde pour dire ce qu'on trouve ici.
         *
         * Vide, le nom de l'atelier reprend sa place : rien ne casse.
         */
        heroTitle: fields.text({
          label: 'Grand titre affiché sur l’image — vide pour reprendre le titre',
          description:
            'Ce que voit un visiteur qui arrive d’une recherche. Ex. : « Apprenez à coudre en petits groupes, dans le Tarn ».',
        }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoTitle: fields.text({
          label: 'Titre SEO (balise <title>, indépendant du titre affiché)',
        }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('homepage'),
        /*
         * LE SEUL GESTE PROPOSÉ DANS L'IMAGE DE COUVERTURE.
         *
         * Le héros n'en offrait aucun : il fallait faire défiler deux écrans sur
         * un téléphone avant de rencontrer le premier bouton. Ce lien-ci ne
         * demande pas d'écrire — il descend aux formules — et ne concurrence
         * donc pas les boutons de contact plus bas.
         *
         * Vide, il ne s'affiche pas.
         */
        heroLinkLabel: fields.text({
          label: 'Lien dans l’image de couverture — vide pour masquer',
          description: 'Descend jusqu’aux trois formules. Ex. : « Voir les formules ».',
        }),
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
            /*
             * Un REPLI, et rien de plus : ce qui s'affiche vient de la base et
             * du CMS, recomposé à chaque construction. Ce champ ne paraît que
             * si la base n'a pas répondu — d'où la consigne d'y écrire un prix
             * juste plutôt qu'un chiffre d'appel qui, ce jour-là, serait le
             * seul visible.
             */
            priceRange: fields.text({
              label: 'Prix affiché — repli si la base ne répond pas',
              description:
                'Ex. : « 36 €/mois pour 10 séances (28 € enfant) ». Écrivez le prix réel, pas un prix d’appel.',
            }),
            shortDescription: fields.text({ label: 'Description courte', multiline: true }),
          }),
          {
            label: 'Cartes services',
            itemLabel: (props) => props.fields.label.value || 'Carte',
          },
        ),
        /*
         * LA PHRASE QUI DÉSIGNE UNE PORTE PARMI TROIS.
         *
         * Les trois cartes se valent, et c'est le problème : le débutant qui ne
         * sait pas choisir entre elles ne choisit rien. « Il y a forcément une
         * formule qui vous correspond » l'affirme sans l'aider ; cette ligne-ci
         * nomme celle par où commencer, la moins engageante des trois.
         *
         * ELLE PRÉCÈDE LES CARTES. Dessous, elle arrivait après le choix
         * qu'elle devait guider.
         *
         * LE MONTANT QU'ELLE CONTIENT EST RELU EN BASE avant affichage, comme
         * partout ailleurs sur cette page : une phrase d'orientation qui
         * annoncerait un prix périmé enverrait vers une page qui la dément.
         * Écrivez le tarif du jour, il sera corrigé tout seul s'il change.
         *
         * Vide, la ligne ne s'affiche pas.
         */
        orientationText: fields.text({
          label: 'Ligne « par où commencer » — vide pour masquer',
          description:
            'Affichée au-dessus des trois cartes. Le premier montant écrit est remplacé par le prix d’une séance adulte lu en base.',
          multiline: true,
        }),
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
        /* Les trois titres des fiches de stage, une page par stage. */
        articlesSectionTitle: fields.text({ label: 'Titre section articles liés (fiches)' }),
        autresStagesTitle: fields.text({ label: 'Titre section autres stages (fiches)' }),
        retourMoyeuLabel: fields.text({ label: 'Libellé du retour vers la liste des stages' }),
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
            /*
             * LES ARTICLES QUI PRÉPARENT CE STAGE.
             *
             * Chaque stage a maintenant sa page, et une page qui ne mène nulle
             * part est une impasse : on y arrive par « stage surjeteuse », on
             * lit, et soit on écrit à Isabelle, soit on repart. Ces renvois
             * ouvrent la troisième porte — lire d'abord, s'inscrire ensuite —
             * et donnent au passage aux vingt-deux articles du blog des liens
             * entrants depuis des pages que Google visite souvent.
             *
             * À choisir sur le SUJET, non sur la fraîcheur : l'article sur la
             * surjeteuse appartient au stage surjeteuse, et à lui seul.
             */
            articles: fields.array(
              fields.relationship({ label: 'Article', collection: 'blog' }),
              {
                label: 'Articles de blog liés (optionnel)',
                itemLabel: (props) => props.value || 'Article',
              },
            ),
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
              // Les publics viennent de la table commune au code et à la base.
              // Recopiés ici, ils vieillissaient à part : les ados existaient en
              // base et restaient impossibles à tarifer dans le CMS.
              options: AUDIENCES.map((a) => ({ label: a.label, value: a.creneau })),
              defaultValue: AUDIENCES[0].creneau,
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
            itemLabel: (props) =>
              AUDIENCES.find((a) => a.creneau === props.fields.audience.value)?.label ??
              props.fields.audience.value,
          },
        ),
        creneaux: fields.array(
          fields.object({
            name: fields.text({ label: 'Nom du créneau' }),
            location: fields.text({ label: 'Lieu (ex: Revel, Verdalle)' }),
            day: fields.text({ label: 'Jour (ex: Jeudi)' }),
            // Laisser vide retire la ligne entière de la carte, durée comprise :
            // c'est ce qu'on veut d'un créneau « sur demande », dont aucune date
            // ne garantit l'horaire annoncé.
            time: fields.text({ label: 'Horaire (ex: 14h à 17h — vide si sur demande)' }),
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
        inscriptionLabel: fields.text({
          label: 'Bouton d’inscription en ligne',
          description: 'Videz-le pour retirer le bouton de la page.',
        }),
        inscriptionUrl: fields.text({ label: 'Lien du bouton d’inscription' }),
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
        // La pastille de lieu, à côté de celles des tarifs. Vider ce champ la
        // retire — le sous-libellé part avec elle, n'ayant plus rien à qualifier.
        location: fields.text({
          label: 'Lieu, en pastille (ex: Revel) — vide pour retirer la pastille',
          multiline: true,
        }),
        locationLabel: fields.text({ label: 'Sous-libellé lieu (ex: dans le Tarn)' }),
        descriptionTitle: fields.text({ label: 'Titre section description' }),
        description: fields.text({ label: 'Description du déroulement', multiline: true }),
        /*
         * CE QU'ON PEUT Y FAIRE — la question qui précède « pour qui ».
         *
         * « Vous venez avec votre projet personnel » suppose qu'on en ait un.
         * Le débutant qui hésite n'a justement pas de projet : il a une envie
         * vague et la crainte qu'elle soit trop petite, ou trop ambitieuse,
         * pour justifier une séance. Nommer des gestes ordinaires — un ourlet,
         * une fermeture éclair — répond à cette crainte mieux qu'une invitation
         * à venir avec une idée.
         *
         * Même gabarit que la liste « à qui s'adresse cette formule », qui la
         * suit : une phrase par ligne, cochée.
         */
        ideesTitle: fields.text({ label: 'Titre section idées d’activités' }),
        ideesItems: fields.array(fields.text({ label: 'Idée' }), {
          label: 'Idées d’activités',
          itemLabel: (props) => props.value || 'Idée',
        }),
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
        /*
         * CE QUE LA GALERIE NE DIT PAS TOUTE SEULE.
         *
         * Trois photos et deux phrases : la page montrait des pièces sans rien
         * apprendre à qui les regarde, et c'est à peu près ce que Google en
         * retenait. Ces sections disent le geste derrière l'objet — pourquoi une
         * jupe cercle se repose avant l'ourlet, ce qu'une encolure carrée
         * demande de précision. C'est la même chose qui se joue dans les deux
         * lectures : une galerie qui explique vaut mieux qu'une galerie muette.
         */
        sections: fields.array(
          fields.object({
            title: fields.text({ label: 'Titre de section' }),
            text: fields.text({ label: 'Texte', multiline: true }),
          }),
          {
            label: 'Sections de contenu',
            itemLabel: (props) => props.fields.title.value || 'Section',
          },
        ),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
      },
    }),
    glossaireIndex: singleton({
      label: 'Glossaire (page d’accueil)',
      path: 'src/content/pages/glossaire/',
      previewUrl: '/glossaire/',
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('glossaire'),
        introduction: fields.text({ label: 'Introduction', multiline: true }),
        enAtelierTitre: fields.text({
          label: 'Titre de la section « En atelier »',
          description: 'Affiché sur chaque fiche, au-dessus de ce qu’Isabelle observe.',
        }),
        termesLiesTitre: fields.text({ label: 'Titre de la section « Termes liés »' }),
        lireLabel: fields.text({
          label: 'Libellé du renvoi vers un article',
          description: 'Le titre de l’article est ajouté à la suite.',
        }),
        stageLabel: fields.text({ label: 'Libellé du renvoi vers un stage' }),
        crossLinksText: fields.text({ label: 'Texte liens croisés', multiline: true }),
        ctaText: fields.text({ label: 'Texte au-dessus du bouton', multiline: true }),
        ctaLabel: fields.text({ label: 'Libellé du bouton CTA' }),
        backToListLabel: fields.text({ label: 'Libellé du retour au glossaire' }),
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
        /*
         * LA SEULE PHRASE QUI TIENNE LIEU DE PROMESSE.
         *
         * « Nous vous répondrons dans les meilleurs délais » n'engage à rien :
         * aucun envoi ne peut lui être opposé après coup. Une durée écrite, si.
         * Elle s'affiche juste au-dessus du formulaire, là où l'on hésite.
         *
         * N'ANNONCEZ QUE CE QUE VOUS TENEZ. Ce champ vaut mieux vide qu'avec un
         * délai que la vie de l'atelier dément une semaine sur deux : une
         * promesse manquée coûte davantage que l'absence de promesse.
         */
        delaiReponse: fields.text({
          label: 'Délai de réponse — vide pour masquer',
          description:
            'Affiché au-dessus du formulaire. Ex. : « Isabelle vous répond sous 48 h. »',
          multiline: true,
        }),
        alternativeTexte: fields.text({
          label: 'Phrase précédant le téléphone, sous le formulaire',
          description:
            'Le numéro et WhatsApp suivent automatiquement. Ex. : « Vous préférez parler de vive voix ? »',
        }),
        /*
         * CE QU'ON CHERCHE SUR UNE PAGE DE CONTACT ET QU'ELLE NE DISAIT PAS.
         *
         * Le formulaire vit dans une iframe : pour un moteur de recherche, cette
         * page ne contenait presque rien, et pour un visiteur elle ne répondait
         * pas à la question qui vient juste après « je vais écrire » — où est-ce,
         * au fait. « En Rivals » est un lieu-dit : l'adresse seule ne suffit pas
         * à s'y rendre, et le dire ici épargne un appel.
         *
         * N'Y METTEZ QUE DU VÉRIFIABLE. Une page de contact est le mauvais
         * endroit pour meubler : chaque phrase y est lue comme un engagement.
         */
        sections: fields.array(
          fields.object({
            title: fields.text({ label: 'Titre de section' }),
            text: fields.text({ label: 'Texte', multiline: true }),
          }),
          {
            label: 'Informations pratiques — sous le formulaire',
            itemLabel: (props) => props.fields.title.value || 'Section',
          },
        ),
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
    conditions: singleton({
      label: 'Règlement intérieur et conditions de vente',
      path: 'src/content/pages/conditions/',
      previewUrl: '/conditions/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Titre' }),
        subtitle: fields.text({ label: 'Sous-titre' }),
        seoDescription: fields.text({ label: 'Description SEO', multiline: true }),
        ...coverImageFields('conditions'),
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
    /*
     * LES TÉMOIGNAGES, RECOPIÉS DEPUIS GOOGLE OU RECUEILLIS DIRECTEMENT.
     *
     * Une collection et non un champ répété dans chaque page : le même
     * témoignage sert aux ateliers, aux stages et à l'accueil, et le dupliquer
     * garantirait qu'une version en retard traîne quelque part.
     *
     * `pages` décide où chacun s'affiche. Un témoignage d'élève d'atelier n'a
     * rien à prouver sur la page des stages, où il ferait du remplissage.
     */
    temoignages: collection({
      label: 'Témoignages',
      slugField: 'auteur',
      path: 'src/content/temoignages/*',
      format: { data: 'yaml' },
      schema: {
        auteur: fields.slug({
          name: { label: 'Prénom (ou prénom et initiale)' },
          slug: { label: 'Identifiant (généré)' },
        }),
        texte: fields.text({ label: 'Témoignage', multiline: true }),
        note: fields.select({
          label: 'Note donnée',
          options: [
            { label: '★★★★★ (5)', value: '5' },
            { label: '★★★★ (4)', value: '4' },
            { label: '★★★ (3)', value: '3' },
            { label: '★★ (2)', value: '2' },
            { label: '★ (1)', value: '1' },
          ],
          defaultValue: '5',
        }),
        lieu: fields.text({ label: 'Commune (optionnel, ex : Revel)' }),
        source: fields.select({
          label: 'Origine',
          options: [
            { label: 'Avis Google', value: 'google' },
            { label: 'Recueilli directement', value: 'direct' },
          ],
          defaultValue: 'google',
        }),
        pages: fields.multiselect({
          label: 'Afficher sur',
          options: [
            { label: 'Accueil', value: 'accueil' },
            { label: 'Ateliers réguliers', value: 'ateliers' },
            { label: 'Stages thématiques', value: 'stages' },
            { label: 'Séances sans engagement', value: 'seances' },
            { label: 'Contact', value: 'contact' },
          ],
          defaultValue: ['accueil', 'ateliers', 'stages', 'seances', 'contact'],
        }),
      },
    }),
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
        /*
         * LE TITRE TEL QUE GOOGLE L'AFFICHE — à ne remplir que s'il diffère.
         *
         * Le titre ci-dessus a deux métiers qui ne demandent pas la même
         * longueur : il est la grande ligne en haut de l'article, où l'on peut
         * respirer, et il est la source du slug — le raccourcir déplacerait
         * l'adresse de la page, ce qui ne se fait pas pour gagner un mot.
         *
         * Ce champ ne sert donc qu'aux titres qui dépassent les ~60 caractères
         * affichés par Google. Vide, c'est le titre de l'article qui part, et
         * c'est le cas pour vingt des vingt-deux articles.
         */
        seoTitle: fields.text({
          label: 'Titre SEO — vide sauf si le titre dépasse ~60 caractères',
          description:
            'Vide : le titre de l’article est utilisé tel quel. Le nom du site n’est pas ajouté derrière, sur le blog.',
        }),
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
    /*
     * LE GLOSSAIRE DE LA COUTURE.
     *
     * POURQUOI UNE COLLECTION ET NON DES ARTICLES. Un article de blog se lit
     * une fois, en entier, et porte une date ; une définition se consulte, au
     * milieu d'autre chose, et ne vieillit pas. « Qu'est-ce que le droit fil »
     * appelle quatre lignes exactes, pas un billet de mille mots — et c'est
     * précisément ce qu'un moteur de réponse sait extraire et citer.
     *
     * LE CHAMP QUI COMPTE EST `definitionCourte`. Deux phrases qui tiennent
     * seules, hors de la page qui les entoure : c'est ce qui est balisé, ce qui
     * sert de méta-description, et ce qu'un lecteur pressé retient. Le reste de
     * la fiche l'explique ; il ne la remplace pas.
     *
     * `enAtelier` EST CE QUI NOUS APPARTIENT. Une définition se recopie d'un
     * dictionnaire ; ce qu'Isabelle voit rater sur ce geste précis, tous les
     * mois, depuis des années, ne se recopie nulle part. Sans ce champ, ces
     * quarante fiches seraient quarante paraphrases de Wikipédia, et le
     * mériteraient.
     */
    glossaire: collection({
      label: 'Glossaire',
      slugField: 'terme',
      path: 'src/content/glossaire/*',
      format: { data: 'yaml' },
      previewUrl: '/glossaire/{slug}/',
      columns: ['terme', 'categorie'],
      schema: {
        terme: fields.slug({
          name: { label: 'Terme' },
          slug: { label: 'Identifiant (URL)' },
        }),
        definitionCourte: fields.text({
          label: 'Définition courte',
          description:
            'Une à deux phrases qui se comprennent seules, sans le reste de la page. Sert de méta-description et de réponse extractible.',
          multiline: true,
        }),
        explication: fields.text({
          label: 'Explication',
          description: 'Deux à quatre paragraphes, séparés par une ligne vide.',
          multiline: true,
        }),
        enAtelier: fields.text({
          label: 'En atelier (optionnel)',
          description:
            'Ce qu’Isabelle observe, corrige ou fait refaire sur ce geste. C’est la seule partie de la fiche qui ne se trouve nulle part ailleurs.',
          multiline: true,
        }),
        categorie: fields.select({
          label: 'Catégorie',
          options: [
            { label: 'Gestes et coutures', value: 'gestes' },
            { label: 'Finitions', value: 'finitions' },
            { label: 'Patronage et mesures', value: 'patronage' },
            { label: 'Tissus et matières', value: 'tissus' },
            { label: 'Machine et réglages', value: 'machine' },
          ],
          defaultValue: 'gestes',
        }),
        /*
         * Les autres noms du même geste. « Marge de couture » et « valeur de
         * couture » désignent la même chose : deux fiches se seraient annulées
         * l'une l'autre dans les résultats. Une seule les porte, l'autre nom
         * s'affiche et se balise comme variante.
         */
        synonymes: fields.array(fields.text({ label: 'Synonyme' }), {
          label: 'Autres noms (optionnel)',
          itemLabel: (props) => props.value || 'Synonyme',
        }),
        termesLies: fields.array(
          fields.relationship({ label: 'Terme', collection: 'glossaire' }),
          {
            label: 'Termes liés',
            description: 'Deux à quatre renvois, choisis sur le sens.',
            itemLabel: (props) => props.value || 'Terme',
          },
        ),
        article: fields.relationship({
          label: 'Article de blog qui développe (optionnel)',
          collection: 'blog',
        }),
        /*
         * Le chemin est saisi à la main plutôt que choisi dans une liste : les
         * stages vivent en base, pas dans le CMS, et Keystatic ne sait pas les
         * proposer. Un stage renommé changerait son adresse et laisserait ce
         * lien dans le vide — le contrôle des liens internes le verrait.
         */
        stage: fields.text({
          label: 'Stage concerné (optionnel)',
          description: 'Chemin complet, par exemple /stages-thematiques/stage-surjeteuse/',
        }),
        seoDescription: fields.text({
          label: 'Description SEO (optionnel)',
          description: 'Laisser vide pour reprendre la définition courte.',
          multiline: true,
        }),
        lastModified: fields.date({ label: 'Dernière modification' }),
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
