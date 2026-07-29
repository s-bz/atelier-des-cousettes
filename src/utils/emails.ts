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
 */

const EXPEDITEUR = "L'Atelier des Cousettes <no_reply@portail.atelier-des-cousettes.fr>";
const REPONSE_VERS = 'info@atelier-des-cousettes.fr';
const LIEN_PLANNING = 'https://atelier-des-cousettes.fr/espace-membre/planning/';

function cle(): string {
  const k = import.meta.env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!k) throw new Error("Variable d'environnement manquante : RESEND_API_KEY");
  return k;
}

export interface Message {
  sujet: string;
  corps: string;
}

/**
 * Envoie un message. Renvoie `true` si Resend l'a accepté.
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

/** Valeurs disponibles dans les gabarits, pour un contexte donné. */
export function variables(c: Contexte): Record<string, string> {
  return {
    prenom: c.prenom,
    date: dateLongue.format(new Date(c.starts_at)),
    heure_debut: heure.format(new Date(c.starts_at)),
    heure_fin: heure.format(new Date(c.ends_at)),
    lieu: c.location,
    lien: LIEN_PLANNING,
  };
}

/**
 * Remplace {{variable}} par sa valeur.
 *
 * Une variable inconnue est laissée telle quelle plutôt que vidée : un
 * « {{prenm}} » visible dans le message reçu signale la faute de frappe, là où
 * un trou silencieux passerait inaperçu jusqu'à ce que quelqu'un le signale.
 */
export function remplir(gabarit: string, valeurs: Record<string, string>): string {
  return gabarit.replace(/\{\{\s*(\w+)\s*\}\}/g, (entier, nom) =>
    nom in valeurs ? valeurs[nom] : entier,
  );
}

/** Charge un gabarit et le remplit. Renvoie null si le gabarit a disparu. */
export async function preparer(id: string, contexte: Contexte): Promise<Message | null> {
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

  const valeurs = variables(contexte);
  return {
    sujet: remplir(data.subject, valeurs),
    corps: remplir(data.body, valeurs),
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
  contexte: Contexte,
): Promise<boolean> {
  if (!destinataire) return false;
  const message = await preparer(id, contexte);
  if (!message) return false;
  return envoyer(destinataire, message);
}
