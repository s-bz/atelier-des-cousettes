import { getAdminClient } from './supabase';
import { lienWhatsApp } from './contact';

/**
 * Envoi des e-mails du service.
 *
 * UNE seule fonction d'envoi, et le Reply-To y est posé une fois pour toutes.
 * Le recopier à chaque appel finirait par manquer quelque part — et le message
 * où il manquerait serait celui auquel quelqu'un a répondu.
 *
 * Pourquoi un Reply-To : l'expéditeur est une adresse « no reply » sur un
 * sous-domaine authentifié, mais sur une vingtaine d'adhérents, souvent peu à
 * l'aise avec le numérique, certains répondront au rappel plutôt que d'aller
 * sur le site. Sans Reply-To, ces réponses disparaissent et Isabelle croit la
 * personne présente.
 *
 * Les TEXTES ne sont pas ici : ils vivent en base, modifiables par Isabelle
 * depuis l'administration. Ce sont ses mots, adressés à ses adhérents.
 *
 * L'HABILLAGE, lui, est ici. Isabelle écrit du texte simple ; le code
 * l'enveloppe aux couleurs du site. Lui faire éditer du HTML serait lui
 * demander de maintenir une mise en page à la main, et un e-mail cassé serait
 * alors un e-mail parti.
 */

const EXPEDITEUR = "L'Atelier des Cousettes <no_reply@portail.atelier-des-cousettes.fr>";
const REPONSE_VERS = 'info@atelier-des-cousettes.fr';

/**
 * Où partent les messages destinés à Isabelle.
 *
 * La boîte de l'atelier, et non « tous les comptes admin » : le rôle admin est
 * aussi porté par des comptes techniques, qui n'ont rien à faire d'un avis de
 * réservation. Une adresse nommée pour son usage se change en une ligne, là où
 * une requête sur les rôles se change en réfléchissant.
 */
const ADMIN = 'info@atelier-des-cousettes.fr';

/**
 * La signature, sur tous les messages sans exception.
 *
 * Posée dans l'habillage et non dans les gabarits : recopiée cinq fois, elle
 * finirait par manquer au sixième message — celui, justement, qu'on reçoit
 * quand on cherche à joindre quelqu'un.
 *
 * WhatsApp autant que l'e-mail parce que c'est le canal réellement utilisé :
 * un adhérent qui ne peut pas venir jeudi écrit un message, il n'ouvre pas son
 * client de messagerie.
 *
 * Valeurs reprises de src/content/site-settings.yaml — comme les couleurs le
 * sont de global.css. Un e-mail ne peut lire ni l'un ni l'autre.
 */
const CONTACT = {
  email: 'info@atelier-des-cousettes.fr',
  mobile: '06 95 78 36 34',
};
const WHATSAPP = lienWhatsApp(CONTACT.mobile);

const SIGNATURE_TEXTE =
  `— L'Atelier des Cousettes\n` +
  `Email : ${CONTACT.email}\n` +
  `WhatsApp : ${CONTACT.mobile}\n` +
  `Vous pouvez aussi répondre directement à ce message.`;
const LIEN_PLANNING = 'https://atelier-des-cousettes.fr/espace-membre/planning/';
const LIEN_ESPACE = 'https://atelier-des-cousettes.fr/espace-membre/';

// Reprises de src/styles/global.css. Un e-mail ne peut pas lire une feuille de
// style : les valeurs sont donc recopiées, et ce commentaire dit d'où.
const COULEURS = {
  fond: '#f5f4ed',
  carte: '#faf9f5',
  trait: '#e8e6dc',
  titre: '#141413',
  texte: '#5e5d59',
  discret: '#87867f',
  accent: '#c96442',
};

// Le thème sombre du site, à l'identique.
const SOMBRE = {
  fond: '#141413',
  carte: '#1e1e1c',
  trait: '#3d3d3a',
  titre: '#faf9f5',
  texte: '#b0aea5',
  discret: '#87867f',
  accent: '#e08a6d',   // --color-link : le corail s'éclaircit sur fond sombre
};

// Les polices du site sont auto-hébergées : aucun client de messagerie ne les
// chargera. On garde donc l'INTENTION — une serif pour les titres, une sans
// pour le texte — avec des familles présentes partout.
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function cle(): string {
  const k = import.meta.env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!k) throw new Error("Variable d'environnement manquante : RESEND_API_KEY");
  return k;
}

export interface Message {
  sujet: string;
  corps: string;
  html: string;
}

/** Valeurs à substituer dans un gabarit. */
export type Valeurs = Record<string, string>;

/**
 * Envoie un message, en texte et en HTML.
 *
 * Les deux versions partent ensemble : le texte reste lisible pour qui bloque
 * le HTML ou lit en mode texte, et sa présence améliore la délivrabilité.
 *
 * N'échoue jamais bruyamment : un e-mail non parti ne doit pas interrompre le
 * traitement des suivants, ni faire échouer l'action qui l'a déclenché. La
 * cause est journalisée, seul moyen de la diagnostiquer plus tard.
 */
export async function envoyer(destinataire: string, message: Message): Promise<boolean> {
  try {
    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cle()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EXPEDITEUR,
        to: [destinataire],
        reply_to: REPONSE_VERS,
        subject: message.sujet,
        text: message.corps,
        html: message.html,
      }),
    });

    if (!reponse.ok) {
      console.error('[emails] envoi refusé :', reponse.status, await reponse.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[emails] envoi impossible :', error);
    return false;
  }
}

const dateLongue = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
});
const heure = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
});

export interface Contexte {
  prenom: string;
  starts_at: string;
  ends_at: string;
  location: string;
}

/**
 * Les deux destinations, dans tous les gabarits.
 *
 * Un seul {{lien}} obligeait à deviner où il menait — le planning ici,
 * l'accueil là — et le libellé du bouton avec lui. Les deux sont désormais
 * nommés et disponibles partout : Isabelle place celui qui convient au message
 * qu'elle écrit. {{lien}} reste servi, en synonyme, pour ne pas casser un
 * gabarit déjà enregistré.
 */
const LIENS = {
  lien_planning: LIEN_PLANNING,
  lien_espace: LIEN_ESPACE,
};

/** Valeurs des gabarits qui parlent d'UNE séance. */
export function variablesSeance(c: Contexte): Valeurs {
  return {
    ...LIENS,
    prenom: c.prenom,
    date: dateLongue.format(new Date(c.starts_at)),
    heure_debut: heure.format(new Date(c.starts_at)),
    heure_fin: heure.format(new Date(c.ends_at)),
    lieu: c.location,
    lien: LIEN_PLANNING,
  };
}

/**
 * Valeurs des gabarits qui parlent d'un STAGE.
 *
 * Le nom du stage en plus, et pour cause : « l'atelier du 21 novembre » ne dit
 * pas lequel, et on peut en suivre deux dans la saison. Les gabarits d'atelier
 * ne le portent pas — ils n'en ont qu'un à décrire, celui du créneau habituel.
 *
 * Ce sont deux familles de messages, non par goût de la symétrie, mais parce
 * que les textes d'atelier promettent un solde et un délai de dix jours : vrais
 * d'une séance de forfait, faux d'un stage réglé à la date.
 */
export function variablesStage(o: {
  prenom: string;
  creneau: string;
  starts_at: string;
  ends_at: string;
  location: string;
}): Valeurs {
  const { lien, ...reste } = variablesSeance({
    prenom: o.prenom,
    starts_at: o.starts_at,
    ends_at: o.ends_at,
    location: o.location,
  });
  return { ...reste, lien, creneau: o.creneau };
}

/**
 * Valeurs du message annonçant qu'une séance change de date.
 *
 * Seul gabarit à porter DEUX dates. Sans l'ancienne, le message dirait « votre
 * séance a lieu le 12 mars » sans qu'on sache laquelle a bougé — or on peut en
 * avoir trois au calendrier, et c'est justement celle qu'on avait notée qu'il
 * faut pouvoir corriger.
 */
export function variablesDeplacement(o: {
  prenom: string;
  avant_starts_at: string;
  starts_at: string;
  ends_at: string;
  location: string;
}): Valeurs {
  return {
    ...variablesSeance({
      prenom: o.prenom,
      starts_at: o.starts_at,
      ends_at: o.ends_at,
      location: o.location,
    }),
    date_avant: dateLongue.format(new Date(o.avant_starts_at)),
    heure_avant: heure.format(new Date(o.avant_starts_at)),
  };
}

/** Une séance, telle qu'elle apparaît dans la liste d'un message d'accueil. */
export interface Ligne {
  starts_at: string;
  ends_at: string;
  location: string;
}

/**
 * Valeurs du message d'accueil.
 *
 * `seances` est une liste à puces en texte simple : le rendu HTML la reconnaît
 * et en fait une vraie liste. Isabelle n'a donc qu'un {{seances}} à placer.
 */
export function variablesAccueil(o: {
  prenom: string;
  creneau: string | null;
  seances: Ligne[];
  solde: number;
}): Valeurs {
  return {
    ...LIENS,
    prenom: o.prenom,
    creneau: o.creneau ?? 'aucun créneau attitré',
    nombre_seances: String(o.seances.length),
    solde: String(o.solde),
    seances: o.seances.length
      ? o.seances
          .map((s) =>
            `- ${dateLongue.format(new Date(s.starts_at))}, ` +
            `${heure.format(new Date(s.starts_at))} – ${heure.format(new Date(s.ends_at))}, ` +
            `${s.location}`)
          .join('\n')
      : '- aucune séance encore programmée',
    lien: LIEN_ESPACE,
  };
}

/**
 * Valeurs des avis envoyés à Isabelle quand quelqu'un réserve ou libère.
 *
 * `places` porte l'occupation APRÈS le geste : c'est la seule information qui
 * lui dise s'il faut agir. « Marie a libéré » ne vaut rien ; « Marie a libéré,
 * il reste 3 places sur 6 » lui dit qu'elle peut proposer la place.
 */
export function variablesAdmin(o: {
  participant: string;
  participant_id?: string;
  starts_at: string;
  ends_at: string;
  location: string;
  creneau: string | null;
  occupees: number;
  capacite: number;
}): Valeurs {
  return {
    ...LIENS,
    // Le lien vers la fiche : c'est de là qu'Isabelle agit — dispenser d'une
    // séance due, appeler quelqu'un. Sans lui, l'avis se termine sur un constat
    // et laisse retrouver la personne à la main.
    lien_fiche: o.participant_id
      ? `https://atelier-des-cousettes.fr/espace-membre/admin/participants/${o.participant_id}/`
      : 'https://atelier-des-cousettes.fr/espace-membre/admin/participants/',
    participant: o.participant,
    date: dateLongue.format(new Date(o.starts_at)),
    heure_debut: heure.format(new Date(o.starts_at)),
    heure_fin: heure.format(new Date(o.ends_at)),
    lieu: o.location,
    creneau: o.creneau ?? '—',
    places: `${o.occupees} / ${o.capacite}`,
    restantes: String(Math.max(0, o.capacite - o.occupees)),
  };
}

/** Une séance de la semaine, avec qui y est attendu. */
export interface SeanceSemaine {
  starts_at: string;
  ends_at: string;
  location: string;
  creneau: string | null;
  capacite: number;
  inscrits: string[];
}

const jourEtDate = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
});

/**
 * Valeurs du récapitulatif hebdomadaire.
 *
 * Une ligne par séance, avec l'occupation et les noms. Les séances vides sont
 * signalées explicitement : c'est la seule chose du récapitulatif sur laquelle
 * Isabelle peut encore agir le dimanche pour la semaine qui vient.
 */
export function variablesSemaine(o: { debut: Date; fin: Date; seances: SeanceSemaine[] }): Valeurs {
  const lignes = o.seances.map((s) => {
    const qui = s.inscrits.length ? s.inscrits.join(', ') : 'personne pour l’instant';
    return `- ${jourEtDate.format(new Date(s.starts_at))}, ` +
           `${heure.format(new Date(s.starts_at))} – ${heure.format(new Date(s.ends_at))}, ` +
           `${s.location} — ${s.inscrits.length}/${s.capacite} : ${qui}`;
  });

  const vides = o.seances.filter((s) => s.inscrits.length === 0).length;

  return {
    ...LIENS,
    periode: `du ${jourEtDate.format(o.debut)} au ${jourEtDate.format(o.fin)}`,
    nombre_seances: String(o.seances.length),
    nombre_inscrits: String(o.seances.reduce((n, s) => n + s.inscrits.length, 0)),
    seances: lignes.length
      ? lignes.join('\n')
      : '- aucun atelier ni stage cette semaine',
    // Une semaine vide n'est pas une semaine où « toutes les séances ont au
    // moins un inscrit » : cette phrase, vraie au sens strict, se lisait comme
    // un feu vert alors qu'il n'y avait rien du tout. Le message part quand
    // même — savoir qu'il n'y a rien fait partie de ce qu'on veut savoir le
    // dimanche.
    alerte: o.seances.length === 0
      ? 'Aucun atelier ni stage n’est prévu cette semaine.'
      : vides
        ? `${vides} séance${vides > 1 ? 's n’ont' : ' n’a'} encore personne.`
        : 'Toutes les séances ont au moins un inscrit.',
  };
}

/**
 * Remplace {{variable}} par sa valeur.
 *
 * Une variable inconnue est laissée telle quelle plutôt que vidée : un
 * « {{prenm}} » visible dans le message reçu signale la faute de frappe, là où
 * un trou silencieux passerait inaperçu jusqu'à ce que quelqu'un le signale.
 */
export function remplir(gabarit: string, valeurs: Valeurs): string {
  return gabarit.replace(/\{\{\s*(\w+)\s*\}\}/g, (entier, nom) =>
    nom in valeurs ? valeurs[nom] : entier,
  );
}

/*
 * LE GUILLEMET COMPTE AUTANT QUE LE CHEVRON.
 *
 * Une partie de ce qui passe ici vient du formulaire public — le prénom d'un
 * participant, recopié dans le récapitulatif envoyé à Isabelle. Sans le
 * guillemet, un nom contenant une adresse suivie d'un `"` refermait l'attribut
 * `href` du lien construit plus bas et en ouvrait un autre, choisi par
 * l'inscrivant. L'apostrophe suit, pour les attributs écrits en `'`.
 */
const echapper = (t: string) =>
  t.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Le guillemet et l'apostrophe sont exclus de l'adresse elle-même : une URL
// n'en contient pas, et les y accepter rouvrirait l'attribut par la bande.
const URL_SEULE = /^https?:\/\/[^\s<>"']+$/;

/**
 * Habille un texte simple aux couleurs de l'atelier.
 *
 * La grammaire reconnue est celle qu'on écrit naturellement, sans la connaître :
 *
 *   - un paragraphe est un bloc séparé par une ligne vide ;
 *   - un bloc réduit à une adresse web devient un bouton ;
 *   - des lignes commençant par « - » deviennent une liste ;
 *   - une adresse web au fil du texte devient un lien.
 *
 * Tout en tables et en styles en ligne : Outlook ignore encore une bonne part
 * du CSS moderne, et un message qui s'effondre chez le tiers des destinataires
 * est un message raté.
 */
export function enHtml(sujet: string, texte: string): string {
  // Normalisation des fins de ligne AVANT tout découpage. Un <textarea> renvoie
  // du CRLF — la norme HTML l'impose — et « \r\n\r\n » ne contient pas deux \n
  // adjacents : sans cette ligne, tout message enregistré depuis l'écran
  // d'édition perdait ses paragraphes et repartait en un seul bloc.
  const blocs = texte.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).map((bloc) => {
    const lignes = bloc.split('\n').map((l) => l.trim()).filter(Boolean);

    // Un bloc de lignes « - … » : liste.
    if (lignes.length > 0 && lignes.every((l) => l.startsWith('- '))) {
      const items = lignes
        .map((l) => `<li style="margin:0 0 8px;">${lienDansTexte(l.slice(2))}</li>`)
        .join('\n      ');
      return `<ul class="e-texte" style="margin:0 0 16px;padding-left:20px;font-family:${SANS};font-size:16px;line-height:1.6;color:${COULEURS.texte};">
      ${items}
    </ul>`;
    }

    // Une ligne réduite à une adresse devient un bouton, où qu'elle se trouve —
    // y compris collée au paragraphe qui la précède. Ne la reconnaître qu'en
    // bloc isolé ferait dépendre le bouton d'une ligne vide qu'Isabelle doit
    // penser à laisser ; oubliée, l'adresse repart en lien nu au fil du texte.
    const morceaux: string[] = [];
    let courant: string[] = [];

    const viderParagraphe = () => {
      if (!courant.length) return;
      morceaux.push(
        `<p class="e-texte" style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${COULEURS.texte};">${
          courant.map(lienDansTexte).join('<br />')
        }</p>`,
      );
      courant = [];
    };

    for (const ligne of lignes) {
      if (URL_SEULE.test(ligne)) {
        viderParagraphe();
        morceaux.push(bouton(ligne));
      } else {
        courant.push(ligne);
      }
    }
    viderParagraphe();

    return morceaux.join('\n        ');
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${echapper(sujet)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .e-fond   { background:${SOMBRE.fond} !important; }
    .e-carte  { background:${SOMBRE.carte} !important; }
    .e-entete { border-bottom-color:${SOMBRE.trait} !important; }
    .e-marque { color:${SOMBRE.titre} !important; }
    .e-texte  { color:${SOMBRE.texte} !important; }
    .e-pied   { color:${SOMBRE.discret} !important; }
    .e-lien   { color:${SOMBRE.accent} !important; }
  }
</style>
</head>
<body class="e-fond" style="margin:0;padding:0;background:${COULEURS.fond};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-fond" style="background:${COULEURS.fond};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="e-carte" style="max-width:560px;background:${COULEURS.carte};border-radius:16px;">
      <tr><td class="e-entete" align="center" style="padding:28px 32px 18px;border-bottom:1px solid ${COULEURS.trait};text-align:center;">
        <span class="e-marque" style="font-family:${SERIF};font-size:21px;color:${COULEURS.titre};">L’Atelier des Cousettes</span>
      </td></tr>
      <tr><td style="padding:28px 32px 8px;">
        ${blocs.join('\n        ')}
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td align="center" style="padding:22px 8px 0;font-family:${SANS};font-size:13px;line-height:1.7;">
        <span class="e-pied" style="color:${COULEURS.discret};">Une question, un empêchement ?</span><br />
        <a class="e-lien" href="mailto:${CONTACT.email}" style="color:${COULEURS.accent};text-decoration:none;">Email ${CONTACT.email}</a>
        <span class="e-pied" style="color:${COULEURS.discret};"> &nbsp;·&nbsp; </span>
        ${WHATSAPP
          ? `<a class="e-lien" href="${WHATSAPP}" style="color:${COULEURS.accent};text-decoration:none;">WhatsApp ${CONTACT.mobile}</a>`
          : `<span class="e-pied" style="color:${COULEURS.discret};">${CONTACT.mobile}</span>`}
        <br />
        <span class="e-pied" style="color:${COULEURS.discret};">
          Vous pouvez aussi répondre directement à ce message.
        </span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Bouton, avec un libellé tiré de la destination.
 *
 * Le libellé se déduit de l'adresse plutôt que de se saisir : le gabarit ne
 * contient qu'une variable, et le texte du bouton ne peut donc pas contredire
 * l'endroit où il mène.
 */
function bouton(url: string): string {
  const cible = echapper(url);
  const libelle = url.includes('/planning/') ? 'Voir le planning' : 'Ouvrir mon espace';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td class="e-bouton" style="border-radius:10px;background:${COULEURS.accent};">
    <a href="${cible}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${libelle}</a>
  </td></tr>
</table>`;
}

const lienDansTexte = (ligne: string) =>
  echapper(ligne).replace(
    // Le `&` reste dans l'adresse : l'échappement l'a déjà transformé en
    // `&amp;`, et l'exclure ici couperait le lien à son premier paramètre.
    // Le guillemet, lui, est devenu `&quot;` — il ne peut plus refermer
    // l'attribut, si bien que l'échappement suffit à clore l'injection.
    /(https?:\/\/[^\s<]+)/g,
    `<a class="e-lien" href="$1" style="color:${COULEURS.accent};">$1</a>`,
  );

/** Charge un gabarit et le remplit. Renvoie null si le gabarit a disparu. */
export async function preparer(id: string, valeurs: Valeurs): Promise<Message | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('email_templates')
    .select('subject, body')
    .eq('id', id)
    .maybeSingle();

  if (!data) {
    console.error(`[emails] gabarit introuvable : ${id}`);
    return null;
  }

  return composer(data, valeurs);
}

/**
 * Le message, à partir du gabarit et des valeurs. Sans base de données.
 *
 * LES LIENS DU SERVICE SONT SERVIS SANS QU'ON LES DEMANDE. Ce sont des
 * constantes — l'espace, le planning — qu'aucun métier n'a de raison de
 * porter. Le courriel d'achat est parti avec « {{lien_espace}} » en toutes
 * lettres parce que son appelant passait ce qu'il connaissait, prénom, produit
 * et dates, et rien d'autre. Les faire réclamer à chaque appelant, c'est les
 * voir manquer au premier qu'on écrit sans y penser.
 *
 * Une valeur explicite reste la plus forte : les gabarits qui posent déjà leurs
 * liens ne changent pas de comportement.
 */
export function composer(gabarit: { subject: string; body: string }, valeurs: Valeurs): Message {
  const tout = { ...LIENS, lien: LIEN_PLANNING, ...valeurs };
  const sujet = remplir(gabarit.subject, tout);
  const corps = remplir(gabarit.body, tout);

  // La signature est ajoutée à la version texte, et rendue par l'habillage pour
  // la version HTML : elle ne doit pas apparaître deux fois dans le message
  // affiché, ni manquer à celui qu'on lit en texte brut.
  return {
    sujet,
    corps: `${corps}\n\n${SIGNATURE_TEXTE}`,
    html: enHtml(sujet, corps),
  };
}

/**
 * Prépare et envoie, si la personne a un compte.
 *
 * Une personne sans compte ne reçoit rien : c'est un cas normal, pas un échec.
 * Isabelle la prévient elle-même, et les écrans le signalent.
 */
export async function notifier(
  id: string,
  destinataire: string | null | undefined,
  valeurs: Valeurs,
): Promise<boolean> {
  if (!destinataire) return false;
  const message = await preparer(id, valeurs);
  if (!message) return false;
  return envoyer(destinataire, message);
}

/**
 * Prévient Isabelle.
 *
 * Séparé de notifier() pour que le destinataire ne soit jamais à fournir : un
 * avis d'administration envoyé par erreur à l'adhérent serait une fuite, et
 * c'est le genre d'argument qu'on inverse un jour de fatigue.
 */
export async function notifierAdmin(id: string, valeurs: Valeurs): Promise<boolean> {
  return notifier(id, ADMIN, valeurs);
}

/**
 * Prévient TOUS les comptes administrateurs, un par un.
 *
 * Réservé au récapitulatif hebdomadaire. Les avis de réservation et de
 * libération continuent de partir sur la seule boîte de l'atelier : ce sont des
 * mouvements du quotidien, et les dupliquer sur chaque compte technique
 * apprendrait surtout à les ignorer. Le point du dimanche, lui, est le genre de
 * chose que chacun veut lire pour soi.
 *
 * Renvoie le nombre de messages partis. Zéro compte admin est possible — un
 * projet fraîchement installé — et ne doit pas faire échouer la tâche de nuit.
 */
export async function notifierAdmins(id: string, valeurs: Valeurs): Promise<number> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('accounts')
    .select('email')
    .eq('role', 'admin')
    .order('email');

  const adresses = [...new Set((data ?? []).map((a) => a.email).filter(Boolean))];
  // Aucun compte admin : on retombe sur la boîte de l'atelier plutôt que de ne
  // rien envoyer. Un récapitulatif muet passerait pour une panne.
  if (adresses.length === 0) return (await notifier(id, ADMIN, valeurs)) ? 1 : 0;

  let partis = 0;
  for (const adresse of adresses) {
    if (await notifier(id, adresse, valeurs)) partis++;
  }
  return partis;
}
