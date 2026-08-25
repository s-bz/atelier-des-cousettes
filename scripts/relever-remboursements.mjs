/**
 * Relève les remboursements chez HelloAsso, et rien d'autre.
 *
 * La tâche quotidienne fait ceci parmi d'autres choses — dont l'envoi des
 * rappels. La lancer à la main pour éprouver un remboursement enverrait donc de
 * vrais courriels à de vraies personnes, onze jours avant leur séance. Ce
 * script ne fait que la partie qu'on veut voir.
 *
 *   node scripts/relever-remboursements.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(),
               l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));

const hote = (env.HELLOASSO_API_HOST ?? 'https://api.helloasso.com').replace(/\/+$/, '');
const org = env.HELLOASSO_ORGANISATION ?? 'les-p-tits-piafs';

const t = await fetch(`${hote}/oauth2/token`, {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials',
    client_id: env.HELLOASSO_CLIENT_ID, client_secret: env.HELLOASSO_CLIENT_SECRET }),
});
if (!t.ok) { console.error('Jeton refusé :', t.status); process.exit(1); }
const { access_token } = await t.json();

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

// Les commandes encore vivantes — celles dont l'inscription court.
const [{ data: abos }, { data: places }] = await Promise.all([
  supabase.from('subscriptions').select('helloasso_order_id')
    .not('helloasso_order_id', 'is', null)
    .gte('ends_on', new Date().toISOString().slice(0, 10)),
  supabase.from('bookings').select('helloasso_order_id')
    .not('helloasso_order_id', 'is', null).eq('status', 'booked'),
]);

const commandes = [...new Set([
  ...(abos ?? []).map((c) => c.helloasso_order_id),
  ...(places ?? []).map((b) => b.helloasso_order_id),
])].filter((c) => c && !c.startsWith('GRATUIT-'));

console.log(`${commandes.length} commande(s) à vérifier`);

const DEFAITS = new Set(['Refunded', 'Refunding', 'Canceled']);
const data = [];

for (const commande of commandes) {
  const r = await fetch(`${hote}/v5/orders/${encodeURIComponent(commande)}`,
                        { headers: { authorization: `Bearer ${access_token}` } });
  if (!r.ok) { console.log(`  commande ${commande} : ${r.status}`); continue; }
  const o = await r.json();
  for (const p of o.payments ?? []) {
    if (DEFAITS.has(p.state)) data.push({ ...p, order: { id: commande } });
  }
}

console.log(`${data.length} paiement(s) défait(s)`);

for (const paiement of data) {
  if (!paiement.id || !paiement.order?.id) continue;
  const { error } = await supabase.from('remboursements').upsert({
    commande: String(paiement.order.id),
    paiement: String(paiement.id),
    montant_cents: paiement.amount ?? 0,
    etat: paiement.state ?? 'Inconnu',
  }, { onConflict: 'paiement', ignoreDuplicates: true });

  console.log(`  #${paiement.id} · commande ${paiement.order.id} · ${paiement.state}`
    + ` · ${(paiement.amount ?? 0) / 100} €` + (error ? ` — ÉCHEC : ${error.message}` : ' — déposé'));
}
