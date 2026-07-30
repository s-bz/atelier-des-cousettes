import type { APIRoute } from 'astro';
import { getAdminClient } from '../../../utils/supabase';
import { construireCalendrier, type Evenement } from '../../../utils/ical';

export const prerender = false;

/**
 * Le calendrier des séances, à laisser s'abonner dans Google, Apple ou Outlook.
 *
 * Un flux iCalendar plutôt qu'un envoi vers l'API Google : l'abonnement se fait
 * en collant une URL, sans compte de service ni consentement OAuth à
 * renouveler, et le même lien fonctionne dans les trois agendas. Le prix à
 * payer est le délai de rafraîchissement, que chaque agenda fixe à sa guise —
 * Google est le plus lent, souvent plusieurs heures.
 *
 * L'ACCÈS TIENT AU SEUL SECRET DE L'URL, parce qu'un agenda va chercher le
 * fichier sans cookie ni en-tête d'authentification. C'est le fonctionnement de
 * l'« adresse secrète au format iCal » de Google lui-même. Le jeton est un uuid
 * tiré au hasard, propre à chaque compte, et se renouvelle d'une requête.
 *
 * Le flux nomme des personnes : il est donc réservé aux comptes administrateurs
 * et n'est jamais mis en cache par un intermédiaire.
 */

/** Deux mois en arrière : de quoi retrouver une séance passée sans alourdir. */
const JOURS_PASSES = 60;


export const GET: APIRoute = async ({ params, site }) => {
  const jeton = (params.token ?? '').trim();

  // Un uuid mal formé ne vaut pas une requête : le vérifier ici évite d'ouvrir
  // la base à tout ce qui frappe à la porte.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jeton)) {
    return new Response('Introuvable', { status: 404 });
  }

  const supabase = getAdminClient();

  const { data: compte } = await supabase
    .from('accounts')
    .select('id, email, role')
    .eq('calendar_token', jeton)
    .maybeSingle();

  // 404 et non 401 : un jeton inconnu ne mérite pas qu'on lui confirme qu'il a
  // la bonne forme mais le mauvais contenu.
  if (!compte || compte.role !== 'admin') {
    return new Response('Introuvable', { status: 404 });
  }

  const depuis = new Date(Date.now() - JOURS_PASSES * 24 * 60 * 60 * 1000).toISOString();

  const { data: seances, error } = await supabase
    .from('sessions')
    .select(`
      id, starts_at, ends_at, location, capacity, places_attente, status,
      creneaux!inner(label, kind, audience),
      bookings(status, participants(first_name, last_name))
    `)
    .gte('starts_at', depuis)
    .order('starts_at');

  if (error) {
    console.error('[calendrier] lecture des séances :', error);
    return new Response('Calendrier momentanément indisponible', { status: 503 });
  }

  const base = site?.origin ?? 'https://atelier-des-cousettes.fr';

  const evenements: Evenement[] = ((seances ?? []) as any[]).map((s) => {
    const reservations = (s.bookings ?? []) as any[];
    const inscrits = reservations.filter((b) => b.status === 'booked');
    const attente = reservations.filter((b) => b.status === 'waiting');

    const nom = (b: any) =>
      [b.participants?.first_name, b.participants?.last_name].filter(Boolean).join(' ').trim()
      || 'Sans nom';

    // Les noms sont triés : l'ordre de la base varie d'une requête à l'autre, et
    // une liste qui se réordonne toute seule ressemble à un changement.
    const noms = (liste: any[]) => liste.map(nom).sort((a, b) => a.localeCompare(b, 'fr'));

    const lien = `${base}/espace-membre/admin/seances/${s.id}/`;

    /*
     * Le titre porte le compte, seule chose lisible dans une grille mensuelle
     * où les événements se réduisent à une ligne. « complet » plutôt que
     * « 3/3 » : le mot se saisit sans compter.
     *
     * AU-DELÀ DES PLACES, ON REVIENT AUX CHIFFRES. Isabelle peut inscrire
     * quelqu'un par-dessus la limite ; « complet » couvrirait alors un « 4/3 »
     * qu'elle a toutes les raisons de vouloir voir — c'est une salle en
     * surnombre, pas une salle pleine.
     */
    const compteur =
      inscrits.length > s.capacity ? `${inscrits.length}/${s.capacity} au-delà`
      : inscrits.length === s.capacity ? 'complet'
      : `${inscrits.length}/${s.capacity}`;
    const titre = [
      s.creneaux?.label ?? 'Séance',
      '—',
      compteur,
      attente.length > 0 ? `· ${attente.length} en attente` : '',
    ].filter(Boolean).join(' ');

    const corps: string[] = [];
    corps.push(
      inscrits.length > 0
        ? `Inscrits (${inscrits.length}/${s.capacity}) :\n${noms(inscrits).map((n) => `· ${n}`).join('\n')}`
        : `Personne d'inscrit pour l'instant (${s.capacity} places).`,
    );
    if (attente.length > 0) {
      corps.push(`Liste d'attente (${attente.length}) :\n${noms(attente).map((n) => `· ${n}`).join('\n')}`);
    }
    // Le lien est répété ici parce que la propriété URL d'un événement ne
    // s'affiche pas dans tous les agendas — dans le corps, elle est toujours là.
    corps.push(`Ouvrir la séance :\n${lien}`);

    return {
      uid: `seance-${s.id}@atelier-des-cousettes.fr`,
      debut: new Date(s.starts_at),
      fin: new Date(s.ends_at),
      titre,
      description: corps.join('\n\n'),
      lieu: s.location ?? undefined,
      url: lien,
      annule: s.status === 'cancelled',
    };
  });

  const ics = construireCalendrier({
    nom: 'Séances — L’Atelier des Cousettes',
    description: `Ateliers et stages, avec les inscrits. ${evenements.length} séances.`,
    evenements,
    // Figé à l'heure ronde : sans cela, chaque rafraîchissement présenterait
    // tous les événements comme modifiés, et certains agendas préviendraient.
    genere: new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000),
  });

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="seances.ics"',
      // Ce flux nomme des personnes : aucun cache partagé ne doit le garder.
      // La minute de cache privé absorbe les agendas qui redemandent aussitôt.
      'Cache-Control': 'private, max-age=60',
    },
  });
};
