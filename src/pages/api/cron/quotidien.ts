import type { APIRoute } from 'astro';
import { getAdminClient } from '../../../utils/supabase';
import { notifier, variablesSeance } from '../../../utils/emails';

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
  const bilan = { inscriptions: 0, rappels: 0, echecs: 0 };

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

  console.log('[cron] terminé :', bilan);
  return new Response(JSON.stringify(bilan), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
