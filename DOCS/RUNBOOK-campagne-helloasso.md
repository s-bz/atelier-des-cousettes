# Runbook — l'encaissement HelloAsso, saison 2026-2027

**État au 24/08/2026.** Ce document remplace une première version bâtie autour
d'une campagne d'adhésion à onze tarifs. Elle est abandonnée : **le catalogue ne
vit pas chez HelloAsso**, il vit dans `formules`, et HelloAsso ne voit qu'un
libellé et un montant.

> **Tranché le 24/08/2026 : l'association Les P'tits Piafs est le vendeur.**
> Elle contracte avec les familles et rémunère Isabelle comme prestataire.
> L'encaissement par HelloAsso est donc légitime. Restent à mettre à jour, avant
> ouverture, la politique de confidentialité, les mentions légales et des CGV
> qui n'existent pas encore — voir `DESIGN-helloasso.md` §1.

## 1. L'architecture retenue

| Ce qui se vend | Par quel mécanisme |
|---|---|
| Forfaits des ateliers réguliers | **Checkout Intent**, piloté depuis le site |
| Stages | **Checkout Intent**, même mécanisme |
| Adhésion 15 € par famille | **Checkout Intent** — le registre est tenu par l'application |
| Séances supplémentaires | **Checkout Intent** (`SPEC-abonnements-credits.md` §7) |

**Pourquoi le Checkout plutôt qu'une campagne.** Le raisonnement complet est au
§2 de `DESIGN-helloasso.md`. En bref : une campagne ne sait ni quel créneau est
choisi, ni si l'adhésion est déjà réglée, ni exiger un nom de participant vérifié,
et elle impose une table de correspondance tarif → formule. Le site, lui,
choisit, valide, calcule, et n'envoie qu'un libellé et un montant.

**Il n'y a plus d'exception.** L'adhésion gardait un formulaire HelloAsso pour
une seule raison — une intention de paiement ne crée ni adhérent, ni carte de
membre, ni ligne au registre. **Tranché le 24/08/2026 : c'est l'application qui
tient le registre**, et cette raison tombe. L'adhésion s'encaisse donc par
Checkout comme le reste, et peut même se régler sur la première échéance d'un
forfait échelonné. Voir `DESIGN-helloasso.md` §3.

## 2. Ce qui est déjà en place

| | |
|---|---|
| Organisation | `les-p-tits-piafs` — vérifiée (`isCashInCompliant: true`) |
| Clé API | `HELLOASSO_CLIENT_ID` / `HELLOASSO_CLIENT_SECRET` dans `.env.local` |
| Portée | `OrganizationAdmin`, scopes `AccessPublicData`, `AccessTransactions`, `Checkout`, `RefundManagement` |
| Formulaires | `Membership/atelier-de-couture` (Draft), `PaymentForm/atelier-de-couture` (Draft), `Checkout/default` (Private) |
| Commandes | aucune — rien n'a jamais été vendu |

L'API ne sait **pas** créer une campagne ni un tarif : le peu qui reste à saisir
se fait dans le back-office. Elle sait en revanche créer une intention de
paiement, et c'est tout ce dont le site a besoin.

## 3. Le ménage dans le back-office

### Supprimer les six tarifs de `Membership/atelier-de-couture`

Ils portent la grille 2025-2026 — « 10 séances / 360 € », « 20 séances / 580 € »,
adultes uniquement — et deux d'entre eux sont faux :

| Tarif | Échéances saisies | Total | Attendu |
|---|---|---|---|
| 10 séances, trimestriel | 120 + 115 + 120 | 355 € | 360 € |
| 20 séances, trimestriel | 193 + 115 + 120 | **428 €** | 580 € |

Les deuxième et troisième échéances du tarif à 20 séances sont une recopie de
celles du tarif à 10 séances : **152 € de moins par adhérent**. Inutile de les
corriger, ils disparaissent tous les six.

### Puis fermer ce formulaire

Il n'a plus d'emploi : l'adhésion passe par Checkout comme le reste. Le laisser
en brouillon suffit — rien ne s'y vend.

### Corriger la description

Elle décrit **une autre association** : « 9 ateliers couture parent/enfant
créatifs (1 par mois **à Ablis**) », dès 6 ans, en duos. Ablis est dans les
Yvelines. Le texte contient en outre un « Réduire » resté d'un copier-coller
d'interface et s'interrompt en milieu de phrase. À remplacer par une description
de l'adhésion à l'association.

**Aucun champ complémentaire n'est nécessaire** : le nom du participant et le
créneau sont saisis sur le site, où ils peuvent être validés.

## 4. Le flux d'achat

1. **Sur le site.** Le visiteur choisit sa formule (lue dans `formules`), son
   créneau (lu dans `creneaux`) et nomme le ou les participants. Le site refuse
   les combinaisons impossibles — 18 séances sur un créneau qui n'en programme
   que neuf — au lieu de les laisser passer et de les rattraper plus tard.
2. **Le serveur crée l'intention.** `POST /organizations/les-p-tits-piafs/checkout-intents`.
3. **Redirection** vers `redirectUrl`. La page HelloAsso ne présente qu'une ligne
   et un montant : rien à choisir, donc rien à contredire.
4. **Retour** sur `returnUrl` → relire `GET /checkout-intents/{id}` et créer le
   compte, les participants et les abonnements. **Ne jamais se fier aux
   paramètres de l'URL de retour**, que la documentation HelloAsso signale comme
   falsifiables (`SPEC-abonnements-credits.md` §7).
5. **Le webhook fait la même chose, de façon idempotente.** On ferme des onglets
   après avoir payé : le retour est le chemin agréable, la notification est le
   chemin fiable. Les deux écrivent exactement les mêmes lignes.
6. **Le choix des dates** se fait ensuite sur le site, dans le créneau acheté.

### Le corps de l'intention

Exemple réel — une mère inscrit ses deux filles en ados 9 séances, et règle
l'adhésion la même saison (donc déjà payée ailleurs : elle n'entre pas ici) :

```json
{
  "totalAmount":   45000,
  "initialAmount":  5000,
  "terms": [ { "amount": 5000, "date": "2026-10-05T00:00:00Z" }, "… 7 autres" ],
  "itemName": "2 forfaits ados 9 séances — saison 2026-2027",
  "backUrl":   "https://atelier-des-cousettes.fr/ateliers-reguliers/",
  "errorUrl":  "https://atelier-des-cousettes.fr/…/erreur/",
  "returnUrl": "https://atelier-des-cousettes.fr/…/retour/",
  "containsDonation": false,
  "metadata": {
    "saison": "2026-2027",
    "lignes": [
      { "formule_id": "2026-2027-ados-9", "creneau_id": "atelier-ados-du-samedi",
        "participant": "…" },
      { "formule_id": "2026-2027-ados-9", "creneau_id": "atelier-ados-du-samedi",
        "participant": "…" }
    ]
  }
}
```

**Une intention ne porte qu'une seule ligne d'article** — un `itemName`, un
montant. Le détail vit dans `metadata`, qui accepte un objet JSON libre jusqu'à
20 000 caractères et **revient intact** sur le `GET`. C'est `metadata` qui
remplace la table de correspondance `helloasso_tiers` prévue au PRD §6 : le
`formule_id` est écrit par le site, il n'a pas à être deviné.

**L'arithmétique est contrainte** : `totalAmount` doit valoir exactement
`initialAmount + Σ terms`. Si l'adhésion est réglée dans la même intention, elle
se pose sur la première échéance.

## 5. Les contraintes vérifiées

Mesurées le 24/08/2026 contre l'organisation réelle, pas lues dans la
documentation :

- **Dix paiements (neuf `terms`) sont acceptés.** C'est le cas des enfants, le
  plus exigeant de la grille. Les adultes et les ados en demandent neuf.
- **Le plafond n'est pas un nombre d'échéances mais un horizon.** Douze paiements
  sont refusés par `ArgumentInvalid` : « Aucune échéance n'est autorisée au delà
  de 12 mois ». Une saison de septembre à juin tient dans dix mois, donc au
  large — mais l'intention doit être créée près du moment de l'achat.
- **`metadata` revient intact** sur `GET /checkout-intents/{id}`, avec la
  commande dès que le paiement est autorisé.

## 6. Ce qui reste à vérifier

**Le recouvrement d'une échéance refusée.** La campagne d'adhésion, avec sa
fréquence `Monthly`, est le vrai produit de prélèvement de HelloAsso : c'est lui
qui émet « Paiement par échéance refusé » et le lien de régularisation valable
30 jours sur lequel `PRD-espace-membre.md` §278 s'appuie pour **ne pas** écrire
de relance. Que les `terms` d'un Checkout produisent les mêmes notifications
n'est pas documenté, et le plafond des 12 mois laisse penser qu'il s'agit d'un
paiement en N fois plutôt que d'un abonnement. À confirmer auprès du support
HelloAsso avant d'ouvrir l'encaissement mensuel.

## 7. L'ordre des opérations
**État au 25/08/2026 :** le code est en production (#167), les migrations sont
appliquées, les trois variables d'environnement sont posées chez Vercel, et
**l'URL de rappel est enregistrée dans le back-office**. Le webhook répond 200,
son jeton est reconnu, et la relecture d'une intention par l'API fonctionne en
production. Rien n'arrive encore : les formulaires sont en brouillon.

**Il ne reste que deux choses avant d'encaisser :** les textes juridiques (§1),
et le ménage des six tarifs périmés (§3).

1. Trancher la question de l'entité. Tout le reste attend.
2. Faire le ménage du §3 — tant que les formulaires sont en Draft, c'est gratuit.
3. Déployer la route de notification, **puis** renseigner l'URL de rappel dans le
   back-office, dans la même session.
4. Brancher le parcours d'achat du site.

**L'URL de rappel doit porter sa barre oblique finale :**

```
https://atelier-des-cousettes.fr/api/helloasso/notifications/
```

Vérifié en production : `trailingSlash: true` vaut aussi pour les routes d'API,
et `/api/cron/quotidien` répond 308 vers `/api/cron/quotidien/`. Un webhook qui
ne suit pas les redirections perdrait la notification, et avec elle une commande
payée.

**Ne jamais encaisser avant que la route réponde.** HelloAsso réémet une
notification non acquittée pendant 48 h ; passé ce délai, une commande payée qui
n'a atterri nulle part est le pire échec possible de ce système.

## 8. Point tranché

- **Le forfait ados** : 225 € les 9 séances, 396 € les 18 (25 € et 44 € par mois
  sur neuf mensualités), confirmé le 24/08/2026. `formules` et le CMS étaient
  justes ; le commentaire de `20260824090100` — « 250 € les 9 séances, 440 € les
  18 » — ne l'est pas.

## Annexe — trace du test

Deux intentions de test non payées subsistent dans l'organisation, libellées
« TEST TECHNIQUE — NE PAS PAYER » : `6936082` (dix versements) et `6936901`
(première échéance à 51 €, puis huit à 36 €). L'API n'offre aucune suppression
d'intention ; elles expirent d'elles-mêmes. Les sondes refusées — douze
échéances, et une échéance au 28 du mois — n'ont rien créé.