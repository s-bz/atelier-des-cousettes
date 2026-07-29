import { getAdminClient } from './supabase';

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

/** Valeurs des gabarits qui parlent d'UNE séance. */
export function variablesSeance(c: Contexte): Valeurs {
  return {
    prenom: c.prenom,
    date: dateLongue.format(new Date(c.starts_at)),
    heure_debut: heure.format(new Date(c.starts_at)),
    heure_fin: heure.format(new Date(c.ends_at)),
    lieu: c.location,
    lien: LIEN_PLANNING,
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

const echapper = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const URL_SEULE = /^https?:\/\/\S+$/;

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
  const blocs = texte.trim().split(/\n{2,}/).map((bloc) => {
    const lignes = bloc.split('\n').map((l) => l.trim()).filter(Boolean);

    // Un bloc qui n'est qu'une adresse : bouton.
    if (lignes.length === 1 && URL_SEULE.test(lignes[0])) {
      const url = echapper(lignes[0]);
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="border-radius:10px;background:${COULEURS.accent};">
    <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Ouvrir mon espace</a>
  </td></tr>
</table>`;
    }

    // Un bloc de lignes « - … » : liste.
    if (lignes.length > 0 && lignes.every((l) => l.startsWith('- '))) {
      const items = lignes
        .map((l) => `<li style="margin:0 0 8px;">${lienDansTexte(l.slice(2))}</li>`)
        .join('\n      ');
      return `<ul style="margin:0 0 16px;padding-left:20px;font-family:${SANS};font-size:16px;line-height:1.6;color:${COULEURS.texte};">
      ${items}
    </ul>`;
    }

    return `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${COULEURS.texte};">${
      lignes.map(lienDansTexte).join('<br />')
    }</p>`;
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${echapper(sujet)}</title>
</head>
<body style="margin:0;padding:0;background:${COULEURS.fond};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.fond};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COULEURS.carte};border-radius:16px;">
      <tr><td style="padding:28px 32px 18px;border-bottom:1px solid ${COULEURS.trait};">
        <span style="font-family:${SERIF};font-size:21px;color:${COULEURS.titre};">L’Atelier des Cousettes</span>
      </td></tr>
      <tr><td style="padding:28px 32px 8px;">
        ${blocs.join('\n        ')}
      </td></tr>
    </table>
    <p style="margin:20px 0 0;max-width:560px;font-family:${SANS};font-size:13px;line-height:1.5;color:${COULEURS.discret};">
      Vous recevez ce message parce que vous participez aux ateliers.
      Vous pouvez répondre directement à cet e-mail.
    </p>
  </td></tr>
</table>
</body>
</html>`;
}

const lienDansTexte = (ligne: string) =>
  echapper(ligne).replace(
    /(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${COULEURS.accent};">$1</a>`,
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

  const sujet = remplir(data.subject, valeurs);
  const corps = remplir(data.body, valeurs);
  return { sujet, corps, html: enHtml(sujet, corps) };
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
