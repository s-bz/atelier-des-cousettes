# Runbook — activer la connexion Google

Étapes manuelles, à faire dans deux tableaux de bord. Rien n'est automatisable
par la CLI. À refaire à l'identique si un second projet Supabase est créé un jour.

Valeurs propres à ce projet :

| | |
| --- | --- |
| Référence Supabase | `dbyljvmjtdujslmfooik` |
| URL de rappel Supabase | `https://dbyljvmjtdujslmfooik.supabase.co/auth/v1/callback` |
| Origine de production | `https://atelier-des-cousettes.fr` |
| Origine de développement | `http://localhost:4321` |

---

## 1. Google Cloud Console

### 1.1 Écran de consentement

**APIs & Services → OAuth consent screen**

- **Audience : External.** « Internal » suppose un Google Workspace ; ce n'est pas le cas ici.
- **Portées** — ajouter les trois, et rien d'autre :
  - `openid` (à ajouter à la main, il n'est pas proposé par défaut)
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
- **Publier l'application** plutôt que de la laisser en « Testing ». En mode test, chaque adhérent devrait être inscrit individuellement comme utilisateur de test — ingérable, et cassé dès qu'une nouvelle personne arrive en cours d'année.

> Ces trois portées sont **non sensibles** : publier ne déclenche aucune procédure de vérification par Google. La vérification (plusieurs jours ouvrés) n'est requise que pour des portées sensibles, qu'on n'utilise pas. Ne pas s'en inquiéter.

Renseigner le nom de l'application et le logo : c'est ce que les adhérents verront sur l'écran Google. « Atelier des Cousettes » inspire plus confiance qu'un identifiant technique.

### 1.2 Identifiants OAuth

**APIs & Services → Credentials → Create credentials → OAuth client ID**

- **Type : Web application**
- **Authorized JavaScript origins**
  - `https://atelier-des-cousettes.fr`
  - `http://localhost:4321`
- **Authorized redirect URIs** — **une seule**, celle de Supabase, jamais celle du site :

  ```text
  https://dbyljvmjtdujslmfooik.supabase.co/auth/v1/callback
  ```

  C'est l'erreur la plus fréquente : y mettre l'URL du site donne un
  `redirect_uri_mismatch` au retour de Google. Google renvoie vers Supabase,
  et c'est Supabase qui renvoie ensuite vers le site.

Conserver le **Client ID** et le **Client Secret**.

## 2. Tableau de bord Supabase

### 2.1 Fournisseur Google

**Authentication → Sign In / Providers → Google** : activer, coller le Client ID et le Client Secret.

### 2.2 URL de redirection autorisées

**Authentication → URL Configuration**

- Site URL : `https://atelier-des-cousettes.fr`
- Redirect URLs : ajouter
  - `https://atelier-des-cousettes.fr/espace-membre/callback/`
  - `http://localhost:4321/espace-membre/callback/`

Une URL absente de cette liste est refusée silencieusement au retour.

### 2.3 Couper l'inscription libre — **indispensable ici**

**Authentication → Sign In / Providers → « Allow new users to sign up » : désactivé.**

Ce n'est pas une précaution générique, c'est ce qui rend la connexion Google
acceptable dans ce projet.

`signInWithOtp` accepte `shouldCreateUser: false`, ce qui empêche une adresse
inconnue de créer un compte. **`signInWithOAuth` n'a pas d'équivalent** : par
défaut, n'importe quel titulaire d'un compte Google qui atteint le bouton crée
une ligne dans `auth.users`. Il n'obtiendrait aucun accès — sans ligne
`accounts` correspondante, l'application affiche « Compte non reconnu » — mais
la table se remplirait de comptes fantômes, et la promesse « aucun compte ne
naît autrement que par la main d'Isabelle » serait fausse.

Couper l'inscription au niveau du projet ferme ce chemin pour de bon, y compris
un appel direct à `/auth/v1/signup`.

## 3. Vérification

```bash
curl -s "$SUPABASE_URL/auth/v1/settings" -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  | grep -o '"google":[a-z]*'
```

Attendu : `"google":true` — il vaut `false` tant que le fournisseur n'est pas activé.

Puis, une fois M2 en place :

- [ ] Se connecter avec un compte Google dont l'adresse correspond à une ligne `accounts` : la session s'ouvre et `auth_user_id` est renseigné.
- [ ] Se connecter avec un compte Google inconnu : message « Compte non reconnu », **et aucune ligne créée** dans `auth.users` ni dans `accounts` — le vérifier en base, c'est le point que l'interface seule ne prouve pas.
- [ ] Se connecter par code puis, plus tard, par Google avec la même adresse : le même compte, pas un doublon.

## 4. Ce qui n'est pas nécessaire

- **Aucune modification de la CSP.** La connexion Google fait sortir le
  navigateur par une navigation de premier niveau, qui n'est contrainte ni par
  `connect-src` ni par `form-action`. C'est aussi pourquoi on utilise la
  redirection et non Google One Tap, qui exigerait `frame-src`.
- **Aucune clé Google dans le code ni dans l'environnement Vercel.** Le Client
  Secret ne vit que dans le tableau de bord Supabase ; l'application ne le voit
  jamais.
