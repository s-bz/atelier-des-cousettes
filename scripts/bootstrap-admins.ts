/**
 * Amorçage des comptes administrateurs.
 *
 *   node --env-file=.env.local scripts/bootstrap-admins.ts
 *
 * Les adresses viennent de ADMIN_EMAILS (séparées par des virgules) et non
 * d'une migration : ce sont des données personnelles, elles n'ont pas à figurer
 * dans l'historique Git.
 *
 * Deux créations par adresse, et les deux sont indispensables :
 *   1. l'utilisateur d'authentification (auth.users) ;
 *   2. la ligne « accounts » portant le rôle, reliée à la première.
 *
 * La connexion utilise shouldCreateUser: false. Sans utilisateur
 * d'authentification, l'envoi du code échoue et personne ne peut se connecter —
 * l'écran afficherait « Compte non reconnu » alors que le compte existe, ce qui
 * désigne la mauvaise cause. Créer un accès, c'est toujours les deux.
 *
 * Idempotent : rejouable sans doublon.
 */
import { getAdminClient } from '../src/utils/supabase.ts';

const emails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (emails.length === 0) {
  console.error('ADMIN_EMAILS est vide ou absent.');
  process.exit(1);
}

const supabase = getAdminClient();

for (const email of emails) {
  // 1. Utilisateur d'authentification. email_confirm évite d'envoyer un e-mail
  //    de confirmation : l'adresse est connue d'avance, elle n'a rien à prouver.
  let authUserId: string | undefined;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (created?.user) {
    authUserId = created.user.id;
    console.log(`${email} : utilisateur d'authentification créé`);
  } else {
    // Déjà présent : on le retrouve plutôt que d'échouer, pour rester rejouable.
    const { data: list, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error(`${email} : ${createError?.message ?? listError.message}`);
      process.exit(1);
    }
    authUserId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!authUserId) {
      console.error(`${email} : création impossible — ${createError?.message}`);
      process.exit(1);
    }
    console.log(`${email} : utilisateur d'authentification déjà présent`);
  }

  // 2. Ligne accounts, porteuse du rôle. Le rôle est lu en base à chaque
  //    requête ; il ne transite jamais par un jeton.
  const { error: upsertError } = await supabase
    .from('accounts')
    .upsert({ email, role: 'admin', auth_user_id: authUserId }, { onConflict: 'email' });

  if (upsertError) {
    console.error(`${email} : ${upsertError.message}`);
    process.exit(1);
  }
  console.log(`${email} : compte administrateur à jour`);
}

console.log(`\n${emails.length} administrateur(s) amorcé(s).`);
