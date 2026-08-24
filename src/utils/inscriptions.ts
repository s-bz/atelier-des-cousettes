import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Créer une inscription : le compte, le participant, l'abonnement.
 *
 * POURQUOI CE FICHIER EXISTE. Ces écritures avaient deux auteurs — l'écran de
 * création d'Isabelle et celui du rattachement d'un accès — et le
 * provisionnement HelloAsso allait en faire un troisième. Le PRD (§6) exige
 * pourtant que les deux voies « écrivent exactement les mêmes lignes » : c'est
 * une promesse qu'on ne peut pas tenir en la recopiant.
 *
 * CE FICHIER NE SAIT RIEN DE L'AFFICHAGE. Chaque fonction rend un résultat, et
 * ne lève pas : l'écran d'admin en fait un bandeau rouge, le provisionnement en
 * fait une ligne dans la file « à traiter ». C'est la seule chose que les deux
 * appelants doivent faire différemment, et c'est donc la seule qui leur reste.
 */

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

const echec = (erreur: string): Resultat<never> => ({ ok: false, erreur });
const succes = <T>(valeur: T): Resultat<T> => ({ ok: true, valeur });

/**
 * La saison à laquelle appartient une date, « 2026-2027 ».
 *
 * LE SEUIL EST AOÛT, ET NON SEPTEMBRE. Une inscription prise pendant l'été
 * appartient à la saison qui vient, non à celle qui s'achève ; la placer en
 * septembre rangerait les inscriptions d'août du mauvais côté. Un début en
 * janvier, lui, appartient à la saison ouverte l'automne précédent.
 */
export function saisonDe(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const annee = d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${annee}-${annee + 1}`;
}

/**
 * Les bornes d'une saison : du 1er septembre au 30 juin.
 *
 * « Un forfait s'achète pour la saison, de septembre à juin » — la grille du
 * CMS. Ces deux dates se saisissaient à la main sur l'écran d'inscription, à
 * chaque adhérent, alors qu'elles se déduisent du nom de la saison.
 *
 * Rend `null` sur une saison illisible, plutôt qu'une date inventée : un champ
 * vide se remarque, une date fausse se corrige sans qu'on la voie.
 */
export function bornesSaison(saison: string): { debut: string; fin: string } | null {
  const m = saison.match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;
  const [, premiere, seconde] = m;
  if (Number(seconde) !== Number(premiere) + 1) return null;
  return { debut: `${premiere}-09-01`, fin: `${seconde}-06-30` };
}

/**
 * « 2026-09 » → « 2026-09-01 ». Une date complète se rend telle quelle.
 *
 * L'écran fait choisir des MOIS — ses libellés le disent depuis toujours,
 * « Premier mois », « Dernier mois » — mais offrait un sélecteur de jour. Le
 * jour n'y a aucun sens et n'apporte qu'une faute possible.
 */
export function premierJourDuMois(mois: string): string {
  return /^\d{4}-\d{2}$/.test(mois) ? `${mois}-01` : mois;
}

/**
 * « 2027-06 » → « 2027-06-30 », « 2027-02 » → « 2027-02-28 », bissextiles
 * comprises. Le jour 0 du mois suivant est le dernier du mois demandé.
 */
export function dernierJourDuMois(mois: string): string {
  if (!/^\d{4}-\d{2}$/.test(mois)) return mois;
  const [an, m] = mois.split('-').map(Number);
  const dernier = new Date(Date.UTC(an, m, 0)).getUTCDate();
  return `${mois}-${String(dernier).padStart(2, '0')}`;
}

/**
 * Le compte d'une famille, retrouvé par son adresse ou créé.
 *
 * L'UTILISATEUR D'AUTHENTIFICATION ET LA LIGNE `accounts`, ENSEMBLE. Sans le
 * premier, la connexion échouerait et l'écran afficherait « Compte non
 * reconnu » alors que le compte existe.
 */
export async function trouverOuCreerCompte(
  supabase: SupabaseClient,
  email: string,
): Promise<Resultat<string>> {
  const adresse = email.trim().toLowerCase();
  if (!adresse) return echec('Adresse électronique manquante.');

  const { data: existant, error: eLecture } = await supabase
    .from('accounts')
    .select('id')
    .eq('email', adresse)
    .maybeSingle();

  if (eLecture) return echec(`Lecture du compte impossible : ${eLecture.message}`);
  if (existant) return succes(existant.id as string);

  const { data: authUser, error: eAuth } = await supabase.auth.admin.createUser({
    email: adresse,
    email_confirm: true,
  });
  if (eAuth || !authUser?.user) {
    return echec(`Création de l’accès impossible : ${eAuth?.message ?? 'erreur inconnue'}`);
  }

  const { data: compte, error: eInsert } = await supabase
    .from('accounts')
    .insert({ email: adresse, auth_user_id: authUser.user.id, role: 'member' })
    .select('id')
    .single();

  if (eInsert) return echec(`Création du compte impossible : ${eInsert.message}`);
  return succes(compte.id as string);
}

export interface ChampsParticipant {
  compteId: string | null;
  prenom: string;
  nom: string;
  audience: string;
  telephone?: string | null;
  notes?: string | null;
}

/**
 * `compteId` est NULLABLE, et c'est central : une adhérente qui ne veut pas de
 * compte existe quand même (`PRD-espace-membre.md` §4).
 */
export async function creerParticipant(
  supabase: SupabaseClient,
  champs: ChampsParticipant,
): Promise<Resultat<string>> {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      account_id: champs.compteId,
      first_name: champs.prenom,
      last_name: champs.nom,
      phone: champs.telephone || null,
      audience: champs.audience,
      notes: champs.notes || null,
    })
    .select('id')
    .single();

  if (error) return echec(`Création impossible : ${error.message}`);
  return succes(data.id as string);
}

export interface ChampsAbonnement {
  participantId: string;
  creneauId?: string | null;
  debut: string;
  fin: string;
  /** Un forfait de saison : le nombre de séances suit la formule. */
  formuleId?: string | null;
  /** Un abonnement à octroi mensuel : exclusif de `formuleId`. */
  creditsParMois?: number | null;
  /** Un forfait sans formule en base — l'ancienne façon de dire la même chose. */
  totalCredits?: number | null;
  saison?: string;
  helloassoOrderId?: string | null;
}

/**
 * `credits_per_month` et `total_credits` s'excluent — la contrainte en base
 * refuse les deux à la fois, et un abonnement sans droit n'a pas de sens.
 * Lorsqu'une formule est désignée, le déclencheur `subscriptions_suit_formule`
 * recopie `formules.seances` dans `total_credits` et annule l'octroi mensuel :
 * il ne faut donc surtout pas les saisir ici en même temps.
 */
export async function creerAbonnement(
  supabase: SupabaseClient,
  champs: ChampsAbonnement,
): Promise<Resultat<string>> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      participant_id: champs.participantId,
      season: champs.saison ?? saisonDe(champs.debut),
      home_creneau_id: champs.creneauId || null,
      formule_id: champs.formuleId ?? null,
      credits_per_month: champs.formuleId ? null : (champs.creditsParMois ?? null),
      total_credits: champs.formuleId ? null : (champs.totalCredits ?? null),
      starts_on: champs.debut,
      ends_on: champs.fin,
      helloasso_order_id: champs.helloassoOrderId ?? null,
    })
    .select('id')
    .single();

  if (error) return echec(`Abonnement impossible : ${error.message}`);
  return succes(data.id as string);
}

/**
 * L'adhésion de la famille est-elle déjà réglée pour cette saison ?
 *
 * Portée par le COMPTE et non par le participant : une mère inscrivant ses deux
 * filles règle 15 €, pas 45 €. Un stage ou une séance sans engagement ne
 * consulte jamais cette table et n'y écrit jamais — l'adhésion comprise dans
 * leur prix n'acquitte pas celle du forfait.
 */
export async function adhesionReglee(
  supabase: SupabaseClient,
  compteId: string,
  saison: string,
): Promise<Resultat<boolean>> {
  const { data, error } = await supabase
    .from('adhesions')
    .select('id')
    .eq('account_id', compteId)
    .eq('saison', saison)
    .maybeSingle();

  if (error) return echec(`Lecture de l’adhésion impossible : ${error.message}`);
  return succes(Boolean(data));
}

/**
 * Inscrit la famille au registre pour la saison, si elle n'y est pas déjà.
 *
 * L'UNICITÉ EN BASE EST LE VRAI GARDE. Deux achats lancés dans deux onglets
 * consulteraient tous deux une table vide et croiraient l'adhésion due ; c'est
 * la contrainte `(account_id, saison)` qui empêche la seconde ligne. Un conflit
 * n'est donc pas une erreur — il dit que quelqu'un a réglé entre-temps — mais
 * le trop-perçu, lui, mérite d'apparaître dans la file « à traiter ».
 */
export async function enregistrerAdhesion(
  supabase: SupabaseClient,
  o: { compteId: string; saison: string; montantCents: number; helloassoOrderId?: string | null },
): Promise<Resultat<{ creee: boolean }>> {
  const { data, error } = await supabase
    .from('adhesions')
    .upsert(
      {
        account_id: o.compteId,
        saison: o.saison,
        montant_cents: o.montantCents,
        helloasso_order_id: o.helloassoOrderId ?? null,
        paye_le: new Date().toISOString(),
      },
      { onConflict: 'account_id,saison', ignoreDuplicates: true },
    )
    .select('id');

  if (error) return echec(`Adhésion impossible : ${error.message}`);
  return succes({ creee: (data ?? []).length > 0 });
}

/**
 * Inscrire d'office tout de suite, sans attendre le cron du lendemain.
 *
 * Sans cela, Isabelle crée quelqu'un, ouvre la feuille de présence, n'y voit
 * personne, et conclut que ça ne marche pas. La fonction est idempotente :
 * l'appeler ici ne fait pas double emploi avec la tâche quotidienne.
 */
export async function inscrireDOffice(supabase: SupabaseClient): Promise<Resultat<number>> {
  const { data, error } = await supabase.rpc('run_auto_enrolment', { p_horizon_days: 60 });
  if (error) return echec(`Auto-inscription impossible : ${error.message}`);
  // Le nombre de places posées : l'écran d'abonnement l'annonce, celui de
  // création l'ignore. Le rendre plutôt que l'avaler évite d'avoir deux
  // façons d'appeler la même procédure.
  return succes((data as number) ?? 0);
}
