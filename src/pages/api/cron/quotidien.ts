import type { APIRoute } from 'astro';
import { getAdminClient } from '../../../utils/supabase';
import { notifier, notifierAdmin, variablesSeance, variablesSemaine } from '../../../utils/emails';

export const prerender = false;

/**
 * Tâche quotidienne : auto-inscription, puis rappels à deux jours.
 *
 * Une seule route pour les deux, parce que le palier Hobby de Vercel n'autorise
 * qu'une exécution par jour. L'ordre compte : on inscrit d'abord, on prévient
 * ensuite — sinon une place attribuée le matin ne serait annoncée que le
 * lendemain.
 *
 * La précision de déclenchement est de l'ordre de l'heure sur Hobby. Sans
 * importance pour un rappel à deux jours ; ce serait rédhibitoire pour un
 * rappel à deux heures.
 */
export const GET: APIRoute = async ({ request }) => {
  // Vercel signe ses appels de cron avec CRON_SECRET. Sans cette vérification,
  // l'URL est publique : n'importe qui pourrait déclencher des envois en boucle
  // et épuiser le quota quotidien de Resend.
  const attendu = import.meta.env?.CRON_SECRET ?? process.env.CRON_SECRET;
  if (!attendu) {
    console.error('[cron] CRON_SECRET absent : exécution refusée');
    return new Response('Non configuré', { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${attendu}`) {
    return new Response('Non autorisé', { status: 401 });
  }

  const supabase = getAdminClient();
  const bilan = { inscriptions: 0, rappels: 0, echecs: 0, recapitulatif: false };

  // ── 1. Auto-inscription ────────────────────────────────────────────────
  const { data: inscrites, error: erreurInscription } =
    await supabase.rpc('run_auto_enrolment', { p_horizon_days: 60 });

  if (erreurInscription) {
    console.error('[cron] auto-inscription :', erreurInscription);
  } else {
    bilan.inscriptions = (inscrites as number) ?? 0;
  }

  // ── 2. Rappels à deux jours ────────────────────────────────────────────
  //
  // Fenêtre d'une journée entière, et non « exactement dans 48 h » : le cron ne
  // se déclenche pas à heure fixe, une fenêtre étroite laisserait passer des
  // séances au gré de la minute d'exécution.
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  debut.setDate(debut.getDate() + 2);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);

  const { data: aPrevenir } = await supabase
    .from('bookings')
    .select(`
      id,
      participants!inner(first_name, accounts(email)),
      sessions!inner(starts_at, ends_at, location, status)
    `)
    .eq('status', 'booked')
    .is('reminder_sent_at', null)
    .gte('sessions.starts_at', debut.toISOString())
    .lt('sessions.starts_at', fin.toISOString())
    .eq('sessions.status', 'scheduled');

  for (const reservation of (aPrevenir ?? []) as any[]) {
    const email = reservation.participants?.accounts?.email;

    // Sans compte, personne à prévenir. On marque quand même : sinon la
    // requête reprendrait cette ligne à chaque exécution, indéfiniment.
    if (email) {
      const parti = await notifier('rappel', email, variablesSeance({
        prenom: reservation.participants.first_name,
        starts_at: reservation.sessions.starts_at,
        ends_at: reservation.sessions.ends_at,
        location: reservation.sessions.location,
      }));
      if (parti) bilan.rappels++;
      else bilan.echecs++;
    }

    await supabase
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', reservation.id);
  }

  // ── 3. Récapitulatif de la semaine, le dimanche ────────────────────────
  //
  // Replié dans la tâche quotidienne plutôt que déclaré comme second cron : le
  // palier Hobby de Vercel n'autorise qu'un déclenchement par jour et par
  // tâche, et un test sur le jour de la semaine ne coûte rien face à une
  // deuxième entrée dans vercel.json qu'il faudrait maintenir en parallèle.
  //
  // Le jour est lu à Paris, pas en UTC : le cron tourne à 07:00 UTC, et un
  // dimanche calculé sur le fuseau du serveur basculerait un jour trop tôt ou
  // trop tard selon l'heure d'été.
  const jourParis = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', timeZone: 'Europe/Paris',
  }).format(new Date());

  if (jourParis === 'Sun') {
    const lundi = new Date();
    lundi.setHours(0, 0, 0, 0);
    lundi.setDate(lundi.getDate() + 1);
    const dimanche = new Date(lundi);
    dimanche.setDate(dimanche.getDate() + 6);
    const borneHaute = new Date(dimanche);
    borneHaute.setDate(borneHaute.getDate() + 1);

    const { data: seances } = await supabase
      .from('sessions')
      .select(`
        starts_at, ends_at, location, capacity,
        creneaux(label),
        bookings(status, participants(first_name, last_name))
      `)
      .gte('starts_at', lundi.toISOString())
      .lt('starts_at', borneHaute.toISOString())
      .eq('status', 'scheduled')
      .order('starts_at');

    const resume = (seances ?? []).map((s: any) => ({
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      location: s.location,
      creneau: s.creneaux?.label ?? null,
      capacite: s.capacity,
      inscrits: (s.bookings ?? [])
        .filter((b: any) => b.status === 'booked')
        .map((b: any) => `${b.participants?.first_name ?? ''} ${b.participants?.last_name ?? ''}`.trim())
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b, 'fr')),
    }));

    const parti = await notifierAdmin('admin_semaine', variablesSemaine({
      debut: lundi, fin: dimanche, seances: resume,
    }));

    bilan.recapitulatif = parti;
    if (!parti) console.error('[cron] récapitulatif hebdomadaire non parti');
  }

  console.log('[cron] terminé :', bilan);
  return new Response(JSON.stringify(bilan), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
