# Conception — l'encaissement HelloAsso

**24/08/2026.** Ce document dit comment les trois produits du site — ateliers
réguliers, stages, séances sans engagement — s'encaissent chez HelloAsso, et
pourquoi ils s'encaissent tous de la même façon. Il remplace le plan HelloAsso
initial, bâti sur une campagne d'adhésion à onze tarifs.

Le runbook opératoire qui l'accompagne : `RUNBOOK-campagne-helloasso.md`.

---

## 1. Qui vend — tranché le 24/08/2026

**L'association Les P'tits Piafs est le vendeur.** Elle contracte avec les
familles pour les ateliers, les stages et les séances, encaisse par HelloAsso, et
rémunère Isabelle comme prestataire.

Cette décision lève le blocage qui pesait sur tout ce document. HelloAsso
n'encaissant que pour une association, et l'association étant désormais la
contrepartie réelle, l'encaissement devient légitime. **Rien de la mécanique
décrite ci-dessous ne change.**

Ce qui change, en revanche, est ailleurs — et n'est pas du code :

| Document | En quoi il est périmé |
| --- | --- |
| `confidentialite/index.mdoc` | « Qui est responsable » ne nomme qu'Entreprise Isabelle Bultez et précise que la politique « ne couvre que les traitements réalisés par L'Atelier des Cousettes ». Les inscriptions, les réservations et les paiements sont désormais des traitements faits **pour l'association** : elle est responsable, seule ou conjointement, et cela doit s'y lire. |
| `mentions-legales/index.mdoc` | N'identifie qu'Entreprise Isabelle BULTEZ. L'éditeur du site peut rester Isabelle, mais **le vendeur doit être identifiable** quelque part. |
| *(absentes)* | Il n'existe aucune **CGV**. Une association qui vend en ligne des prestations datées en a besoin — vente à distance, droit de rétractation et ses règles propres aux services à date fixée. |
| `PRD-espace-membre.md` §235 | L'argument « le site est celui d'une association […] et aucun paiement n'y transite » : sa première moitié est renforcée, la seconde s'affaiblit — le site créera des intentions de paiement côté serveur. Aucune donnée bancaire n'y passe et la page de paiement reste celle de HelloAsso, mais la justification mérite d'être réécrite juste. |

**Et une conséquence visible par l'acheteur :** « L'Atelier des Cousettes » est la
marque d'Isabelle ; le relevé bancaire, lui, portera *Les P'tits Piafs*. Le site
doit le dire **avant** la redirection, faute de quoi le paiement sera contesté par
des gens qui ne reconnaîtront pas le nom.

Enfin, cette décision **alourdit la question du §3** : si l'association vend à
tout le monde, savoir qui est adhérent et qui ne l'est pas cesse d'être une
formalité.

---

## 2. Le principe : un seul mécanisme, trois produits

> **Le catalogue ne vit pas chez HelloAsso.** Il vit dans `formules` et
> `creneaux`. HelloAsso ne voit qu'un libellé et un montant.

Tout ce qui se vend passe par une **intention de paiement** (Checkout Intent)
créée par le site. Le visiteur choisit sur le site, où l'on sait valider ; il
paie chez HelloAsso, où il n'y a rien à choisir.

### Pourquoi pas une campagne avec des tarifs

**La source de vérité est la base**, et elle l'est déjà : `grilleAvecPrixDeLaBase`
reprend de `formules` les montants de la grille du CMS — mensuel, total, nombre
d'échéances — sur l'accueil comme sur la page des ateliers. Le CMS ne porte plus
que les mots. Une campagne HelloAsso y rajouterait une copie des montants, à
tenir d'accord avec la base à chaque changement de tarif. La campagne
actuellement en brouillon administre ce qu'il en coûte : elle porte encore la
grille de 2025-2026, et deux de ses six tarifs sous-facturent, l'un de 152 € par
adhérent.

Cela dit, cet argument est le plus faible des quatre. Un catalogue HelloAsso
resterait petit — cinq formules, un prix chacune — et ne changerait qu'une fois
par saison. **Ce qui décide vraiment, c'est ce qu'une campagne ne sait pas
faire :**

1. **Elle ne sait pas quel créneau est choisi.** Il faudrait une liste
   déroulante, que HelloAsso ne sait pas valider : rien n'y empêcherait
   d'acheter « 18 séances » sur un créneau qui n'en programme que neuf.
2. **Elle ne sait pas si l'adhésion est déjà réglée.** Le site, lui, consulte
   `adhesions (account_id, saison)` avant de la proposer.
3. **Elle impose une table de correspondance** `tarif → formule`, à tenir à jour,
   là où `metadata` porte le `formule_id` écrit directement par le site.
4. **Elle ne sait pas exiger un nom de participant vérifié**, distinct du payeur.

Le Checkout supprime les quatre. Et il en dit à HelloAsso encore moins qu'une
campagne : non pas « le forfait de 9 séances vaut 225 € », mais seulement, au
moment de l'achat, « voici un libellé et un montant ».

### Ce qui distingue les trois produits

Le mécanisme de paiement est identique. Ce qui change, c'est **ce qui s'écrit en
base** une fois le paiement acquis.

| Critère | **Ateliers réguliers** | **Stages** | **Sans engagement** |
| --- | --- | --- | --- |
| Ce qu'on achète | une formule de saison | un stage précis | une séance précise |
| Source du prix | `formules.prix_cents` | `creneaux.default_unit_price_cents` (`kind='stage'`) | `sessions.unit_price_cents` |
| Montants 2026-2027 | 225 € à 531 € | 45 € à 80 € | 45 € (3 h) ou 22 € (jeudi soir, 1 h 30) |
| Quand les dates se choisissent | **après** le paiement, au fil de la saison | à l'achat — le stage porte ses dates | à l'achat |
| Ce que le paiement crée | une ligne `subscriptions` | une ligne `bookings` | une ligne `bookings` |
| Échelonnement | 1 à 10 versements | comptant | comptant |
| Adhésion | **15 €/an/famille, en supplément** | **comprise dans le prix** | **comprise dans le prix** |
| Public | adultes, ados, enfants | adultes | adultes |

**La ligne qui compte est l'avant-dernière.** Un forfait de saison suppose une
adhésion annuelle facturée à part ; un stage et une séance sans engagement
comprennent leur adhésion ponctuelle dans leur prix, et ne la font jamais
apparaître. Le contenu le dit déjà en toutes lettres — « les stages et les
séances sans engagement, eux, comprennent déjà leur adhésion »
(`ateliers-reguliers/index.yaml`).

**La ligne qui structure le code est l'avant-avant-dernière.** Un forfait
n'achète pas des dates, il achète un **droit à venir** que des crédits comptent ;
un stage et une séance achètent une **place précise**. C'est la seule vraie
différence de modèle entre les trois, et elle existe déjà dans le schéma.

---

## 3. L'adhésion, et le registre — tranché le 24/08/2026

**C'est l'application qui tient le registre des adhérents**, pas HelloAsso.

Cette décision retire au formulaire d'adhésion HelloAsso sa seule justification.
Une intention de paiement ne crée ni adhérent, ni carte de membre, ni ligne au
registre ; c'était l'unique raison de conserver un `Membership` pour les 15 €.
Le registre passant à l'application, **l'adhésion s'encaisse comme le reste, par
Checkout**, et il ne reste plus rien à saisir dans le back-office de HelloAsso.

Le garder resterait possible — Isabelle peut préférer son écran d'adhérents —
mais ce serait désormais un confort, non une nécessité.

### Ce que l'application doit alors tenir

```text
adhesions (account_id, saison, paye_le, montant_cents, helloasso_order_id)
           unique (account_id, saison)
```

**Par famille et non par personne** : une mère inscrivant ses deux filles règle
15 €, pas 45 €. L'adhésion se porte donc sur le **compte** — `accounts` modélise
la famille, `participants` l'individu.

Cas prévu par le schéma : `participants.account_id` est nullable — l'adhérente
qui ne veut pas de compte. Pour elle, Isabelle crée une ligne `accounts` sans
`auth_user_id` (la colonne l'autorise), sinon la famille n'existe nulle part et
l'adhésion n'a rien à quoi s'accrocher.

**L'adhésion peut se régler sur la première échéance** d'un forfait échelonné :
51 € puis huit fois 36 €, vérifié (§8). C'est ce que la campagne, elle, ne savait
pas faire.

### La règle, tranchée le 24/08/2026

**L'adhésion est due pour tout atelier régulier, et pour rien d'autre.**

- **Un forfait d'atelier régulier exige l'adhésion.** 15 €, une fois par famille
  et par saison.
- **Un stage ou une séance sans engagement n'en exige aucune** : elle est
  comprise dans le prix, et ne se facture jamais à part.
- **Les deux ne communiquent pas.** L'adhésion comprise dans un stage
  **n'acquitte pas** celle du forfait. Qui a pris un stage en octobre règle
  quand même 15 € s'il prend un forfait en janvier.

Autrement dit, l'adhésion « comprise » n'est pas un droit qu'on acquiert : c'est
une façon de dire qu'il n'y a rien à régler en plus le jour même. Seul l'achat
d'un forfait crée une ligne dans `adhesions`, et seule cette ligne dispense la
famille de repayer dans la saison.

```text
avant tout achat de forfait :
  select 1 from adhesions where account_id = ? and saison = ?
    trouvé      → le forfait seul
    rien        → le forfait + 15 €, et on écrit la ligne
```

Un stage ou une séance n'écrit jamais dans `adhesions` et ne la consulte jamais.

### Qui reconnaît une adhésion déjà réglée

**L'application, et elle seule.** HelloAsso ne sait pas ce qu'est une adhésion
dans un Checkout : il ne voit qu'un montant. Toute la reconnaissance tient donc
dans `adhesions (account_id, saison)`, et repose sur une question préalable :
**comment sait-on que ce second achat est la même famille ?**

- **Si la mère est connectée**, la question ne se pose pas : c'est sa ligne
  `accounts`.
- **Sinon**, on ne dispose que de l'adresse e-mail du payeur, saisie à la main.
  Une adresse différente au second achat crée une seconde famille, et l'adhésion
  se paie deux fois.

**Mais on ne peut pas exiger la connexion avant l'achat.** `connexion.astro`
appelle `signInWithOtp` avec `shouldCreateUser: false` — décision de
`PLAN-M1-admin.md` : « Aucun compte ne doit jamais naître autrement que par la
main d'Isabelle ou par le webhook HelloAsso ». **Une famille nouvelle n'a donc
aucun moyen de se connecter avant d'avoir acheté.** Le parcours se sépare en
deux :

| Qui achète | Comment on l'identifie |
| --- | --- |
| **Famille déjà connue** — compte créé par Isabelle ou par un achat antérieur | **Connexion** à `/espace-membre/connexion/`, puis achat depuis l'espace. Reconnaissance exacte de l'adhésion. |
| **Famille nouvelle**, forfait | Achat **sans compte**, e-mail du payeur saisi sur le site. Le provisionnement crée `accounts`, `participants`, `subscriptions` et `adhesions`, puis l'invite à ouvrir son accès — `signInWithOtp` fonctionnera alors, le compte existant. |
| **Stage ou séance sans engagement** | **Aucun compte requis, jamais.** Rien à réserver ensuite, aucune adhésion à suivre : le provisionnement crée la ligne `accounts` (sans `auth_user_id` au besoin) et la réservation. |

Acheter fait donc naître le compte — ce qui est exactement le mécanisme que M1
avait prévu, et non une entorse : le webhook est l'une des deux voies autorisées.

**Pour un forfait, le compte finira de toute façon par exister**, puisque c'est
dans l'espace adhérent que se choisissent les dates. La connexion n'est donc pas
un obstacle ajouté avant l'achat : c'est la suite normale de l'achat.

**Sans connexion, la clé de rapprochement est l'adresse e-mail du payeur.** Une
faute de frappe crée une seconde famille ; conformément à `PRD-espace-membre.md`
§272, un doublon suspecté part en file « à traiter » plutôt que d'être fusionné
d'office.

**Les achats s'enchaînent, ils ne se préparent pas.** Les 15 minutes de validité
de `redirectUrl` l'imposent de toute façon :

```text
1. Léa   → adhesions : rien   → intention = forfait + 15 €
2. paiement, retour, réconciliation → écrit subscriptions ET adhesions
3. « Ajouter un participant ? »
4. Emma  → adhesions : trouvée → intention = forfait seul
5. paiement, retour
```

Au moment où l'intention d'Emma se crée, celle de Léa est déjà réconciliée : il
n'y a pas de course, pas de réservation provisoire à faire expirer.

**Le cas restant** est celui de deux onglets ouverts avant tout paiement : les
deux intentions porteraient les 15 €. L'unicité sur `(account_id, saison)`
garantit qu'une seule ligne d'adhésion existera, et le trop-perçu ressort dans la
file « à traiter » pour qu'Isabelle rembourse. Pour une vingtaine de familles,
c'est la réponse proportionnée — réserver puis faire expirer coûterait plus cher
que le cas qu'on évite.

**Le registre ne demande pas d'adresse postale** — le nom, le prénom et
l'adresse e-mail que l'application détient déjà suffisent. Rien de nouveau n'est
donc à collecter à l'inscription.

---

## 4. Le parcours d'achat

Identique pour les trois produits.

```text
   SITE                          HELLOASSO                      SITE
   ────                          ─────────                      ────
1. choix + validation
2. POST /checkout-intents  ───►  crée l'intention
                                 renvoie redirectUrl
3. redirection             ───►  page de paiement
                                 (un libellé, un montant)
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
4. returnUrl  ◄──────────                       5. notification webhook
   relit GET /checkout-intents/{id}                 stocke l'événement brut
   provisionne                                      provisionne
                    └───────────────────┬───────────────────┘
                                        ▼
                              6. choix des dates (forfait)
                                 ou place déjà réservée
```

**Les étapes 4 et 5 font la même chose et écrivent les mêmes lignes.** Ce n'est
pas une redondance : on ferme des onglets après avoir payé. Le retour est le
chemin agréable, la notification est le chemin fiable. L'idempotence (§6) est ce
qui rend leur coexistence sûre.

**On ne fait jamais confiance aux paramètres de l'URL de retour**, que la
documentation HelloAsso signale comme falsifiables : le retour ne sert qu'à
déclencher une relecture authentifiée de l'intention
(`SPEC-abonnements-credits.md` §7).

### Le corps de l'intention

Le forfait ados 9 séances de Léa, réglé en neuf fois :

```json
{
  "totalAmount":   22500,
  "initialAmount":  2500,
  "terms": [{ "amount": 2500, "date": "2026-10-05T00:00:00Z" }, "… 7 autres"],
  "itemName": "Forfait ados 9 séances — Léa D. — saison 2026-2027",
  "backUrl":   "https://atelier-des-cousettes.fr/ateliers-reguliers/",
  "errorUrl":  "https://atelier-des-cousettes.fr/…/erreur/",
  "returnUrl": "https://atelier-des-cousettes.fr/…/retour/",
  "containsDonation": false,
  "metadata": {
    "saison": "2026-2027",
    "produit": "forfait",
    "formule_id": "2026-2027-ados-9",
    "creneau_id": "atelier-ados-du-samedi",
    "participant": "Léa D."
  }
}
```

**Une intention ne porte qu'une seule ligne d'article** : un `itemName`, un
montant. Le détail vit dans `metadata`, objet JSON libre jusqu'à
20 000 caractères, qui **revient intact** sur le `GET`. Pour un stage ou une
séance, `metadata` porte `session_id` au lieu de `formule_id`.

C'est `metadata` qui remplace la table `helloasso_tiers` prévue au PRD §6 : le
`formule_id` est **écrit** par le site, il n'a jamais à être deviné depuis un
libellé de tarif.

**L'arithmétique est contrainte** : `totalAmount` doit valoir exactement
`initialAmount + Σ terms`.

### La redirection est obligatoire

Il n'existe **aucune intégration embarquée** pour le Checkout : la page de
paiement refuse d'être encadrée (`x-frame-options: SAMEORIGIN`), une intention ne
renvoie que `redirectUrl`, et la documentation ne propose rien d'autre. Les
`widgetFullUrl` que portent les formulaires d'adhésion et de paiement ne
s'appliquent pas aux intentions.

Reste le choix du **contexte** de la redirection — page entière, nouvel onglet ou
fenêtre surgissante. HelloAsso admet les trois pour sa mire de liaison. La
fenêtre surgissante a un mérite propre ici : la page du site reste vivante
derrière, et `returnUrl` étant sur notre domaine, elle peut prévenir la page
mère puis se refermer. Sur mobile, elle se comporte comme un onglet — c'est-à-dire
comme une redirection.

**`redirectUrl` ne vaut que 15 minutes.** L'intention se crée donc au moment où
l'on clique pour payer, jamais en amont.

### Une intention par participant, jamais par famille

Une mère inscrivant ses deux filles crée **deux intentions**, pas un panier de
deux lignes. Le supplément d'ergonomie d'un paiement unique ne compense pas ce
qu'il coûte :

- **Le remboursement redevient possible.** `POST /payments/{id}/refund` porte sur
  un paiement. Une fille qui arrête en janvier — sur dix mois de saison, ce n'est
  pas une hypothèse — se rembourse proprement. Dans un panier, le paiement couvre
  les deux : il faudrait tout rembourser et refacturer, ou régler l'affaire hors
  plateforme et laisser les écritures diverger de celles de HelloAsso.
- **L'échec devient partiel.** Une carte refusée sur un panier à 450 € n'inscrit
  personne. Deux intentions à 225 € laissent la première aboutir.
- **La file « à traiter » reste lisible.** Un ordre par personne se lit « Léa —
  formule inconnue ». Un panier se lit « une commande, deux lignes, une
  mauvaise » — et quelqu'un doit alors décider s'il provisionne la moitié valable.
  Cette question du provisionnement partiel est vicieuse ; une intention par
  participant la fait disparaître.
- **Les écritures de HelloAsso disent la vérité.** `itemName` étant une chaîne
  unique, un panier n'apparaît que sous forme agrégée au back-office, sur le reçu
  du payeur et dans l'export de versement. Le détail ne vivrait que dans
  `metadata` : commode pour le code, inutile à qui rapproche les comptes depuis
  HelloAsso.
- **L'arithmétique des échéances reste simple.** `totalAmount = initialAmount +
  Σ terms` doit tenir sur l'ensemble du panier, y compris quand les deux filles
  prennent des formules différentes — 9 séances pour l'une, 18 pour l'autre.

**Ce qu'on y perd**, et il faut le savoir : deux saisies de carte au lieu d'une,
et le risque qu'une inscription commencée pour la seconde fille ne soit jamais
terminée. Un panier, lui, ne peut pas se faire à moitié. C'est au site de
compenser — garder la sélection, enchaîner les achats sans tout resaisir.

**Un argument qui ne tient pas :** grouper pour réduire les frais. HelloAsso ne
prend aucune commission — c'est précisément ce qui le fait préférer à Stripe.

**Le point de vigilance :** ne pas facturer l'adhésion deux fois. Elle vaut pour
la famille et se règle à part (§3) ; chaque achat doit donc consulter
`adhesions (account_id, saison)` avant de la proposer. C'est exactement la raison
pour laquelle cette table porte sur le compte et non sur le participant.

---

## 5. Ce que le paiement écrit en base

### Ateliers réguliers

```text
accounts        (la famille — créée ou retrouvée par l'e-mail du payeur)
participants    (une ligne par nom donné dans metadata.lignes)
subscriptions   (participant, saison, formule_id, home_creneau_id,
                 starts_on, ends_on, helloasso_order_id)
```

`total_credits` **ne se saisit pas** : le déclencheur `subscriptions_suit_formule`
le recopie depuis `formules.seances` et met `credits_per_month` à `null`. Les
dates se réservent ensuite, au fil de la saison, et les crédits se décomptent.

### Stages et séances sans engagement

```text
accounts        (idem, si le payeur n'en a pas déjà un)
participants    (idem)
bookings        (session_id, participant_id, source='helloasso', status='booked')
```

Pas d'abonnement, pas de crédits : la place est réservée directement sur la
séance achetée. L'index unique partiel sur `(session_id, participant_id) WHERE
status = 'booked'` rend la double réservation impossible au niveau du schéma.

### Dans tous les cas

```text
helloasso_events (cle, type, identifiant, authentifie, charge_utile, recu_le, traite_le)
```

---

## 6. L'idempotence, et la file « à traiter »

**HelloAsso réémet une notification non acquittée pendant 48 h**, puis
abandonne. Tout le dispositif tient à cette phrase.

- **Chaque événement porte une clé.** `Order:12345` quand la charge utile porte
  un identifiant ; **une empreinte de son contenu sinon**. Jamais une constante :
  une clé constante ferait passer toute notification illisible pour un doublon de
  la précédente, et la commande qu'elle portait disparaîtrait en silence. La
  contrainte `unique` sur `helloasso_events.cle` fait le reste.
- **La route n'interprète rien.** Elle stocke la charge utile brute et s'arrête.
  Plus le traitement est court, moins il peut échouer.
- **Un échec d'écriture répond 500, délibérément.** Répondre 200 sans avoir rien
  enregistré ferait cesser les réémissions et perdrait la notification pour de
  bon. Un 500 fait revenir HelloAsso pendant 48 h : c'est la seule chance de
  rattrapage qui existe.
- **Rattachement plutôt que création.** Si l'e-mail correspond à un compte, on
  s'y rattache. Un doublon suspecté part en file de traitement plutôt que d'être
  fusionné automatiquement.
- **Rien n'est jamais ignoré.** Toute commande non provisionnable — formule
  inconnue, participant sans nom, homonyme douteux — reste `traite_le is null` et
  apparaît dans la file, avec sa charge utile brute. Quelqu'un qui a payé et
  n'apparaît nulle part est le pire échec possible de ce système.

### L'authentification, et ce qu'elle vaut

HelloAsso **ne signe pas** ses notifications : ni secret partagé, ni en-tête à
vérifier. Un jeton dans la chaîne de requête de l'URL de rappel est le seul garde
possible, et il ne prouve pas grand-chose — **il ne décide donc de rien**. Une
notification sans jeton valable est stockée comme les autres, marquée
`authentifie = false`. Le vrai contrôle est la relecture de la commande par
l'API avant tout provisionnement.

### L'URL de rappel

```text
https://atelier-des-cousettes.fr/api/helloasso/notifications/
```

**Barre oblique finale obligatoire.** Vérifié en production : `trailingSlash:
true` vaut aussi pour les routes d'API — `/api/cron/quotidien` répond 308 vers
`/api/cron/quotidien/`. Un webhook qui ne suit pas les redirections perdrait la
notification, et avec elle une commande payée.

---

## 7. L'échec d'un prélèvement

**Signaler, jamais sanctionner** (`PRD-espace-membre.md` §280). Un prélèvement
échoué ne bloque ni l'octroi des crédits, ni les réservations. Une carte expirée
est l'explication la plus fréquente, et couper l'accès dans une association d'une
vingtaine de personnes qui se connaissent toutes serait socialement désastreux.

Pour arrêter réellement les droits, Isabelle **avance `ends_on`** — il n'existe
aucune notion de suspension, et il n'en faut pas.

**Et cela vaut pour le Checkout** — vérifié le 24/08/2026 dans la documentation
technique de HelloAsso (`dev.helloasso.com/docs/paiements-par-échéances`). Le
mécanisme d'échéances y est décrit comme commun à « le checkout, les adhésions,
la billetterie et la boutique », sans distinguer l'API de l'interface, et la page
énonce : « Un email est envoyé à l'utilisateur pour l'informer du refus », « Le
lien de régularisation expire après 30 jours ». La notification correspondante
porte `eventType: "Payment"` et `state: "Refused"`.

Les trois contraintes que cette page énonce sont exactement celles que l'API nous
avait renvoyées à l'essai — le 27 du mois, les 12 mois, le mois courant. C'est ce
qui permet d'affirmer qu'elle décrit bien le même mécanisme, et non celui des
seules campagnes.

**Conséquence : `PRD-espace-membre.md` §278 tient.** L'application ne construit
pas de relance ; elle se contente de savoir.

---

## 8. Les contraintes vérifiées

Mesurées le 24/08/2026 contre l'organisation réelle, pas lues dans la
documentation.

| Contrainte | Constat |
| --- | --- |
| Nombre de versements | **10 (soit 9 `terms`) acceptés** — le cas des enfants, le plus exigeant |
| Plafond réel | **un horizon, pas un compte** : « Aucune échéance n'est autorisée au delà de 12 mois » |
| `metadata` | **revient intact** sur `GET /checkout-intents/{id}`, avec la commande dès le paiement autorisé |
| Lignes par intention | **une seule** — le détail passe par `metadata` |
| Création de tarifs par l'API | **impossible** : back-office uniquement |
| Portée de la clé | `OrganizationAdmin`, scopes `AccessPublicData`, `AccessTransactions`, `Checkout`, `RefundManagement` |
| Client partenaire | **non** — `/partners/me` répond 403 : l'URL de rappel se règle au back-office |
| Jour d'échéance | **le 27 au plus tard** : « Aucune échéance après le 27 de chaque mois n'est autorisée ». Une campagne, elle, accepte le 28 |
| Première échéance | **peut différer des suivantes** : 51 € puis 8 × 36 € accepté — c'est ainsi que l'adhésion se règle avec le premier versement |
| Mois courant | **interdit** : « Aucune échéance n'est autorisée sur le mois courant ou dans le passé ». La première échéance tombe au mois suivant le paiement initial |
| Cadence | **une échéance par mois au maximum** (documentation HelloAsso) |
| Échéance refusée | e-mail automatique au payeur, lien de régularisation **valable 30 jours**, notification `eventType: "Payment"`, `state: "Refused"` |
| Intégration | **redirection obligatoire** : la page de paiement renvoie `x-frame-options: SAMEORIGIN`, une intention ne porte aucune URL de widget, et la documentation dit « Votre site redirige l'utilisateur vers cette URL » |
| Durée de vie de `redirectUrl` | **15 minutes** |
| Paramètres de retour | `checkoutIntentId`, `code=succeeded`, `orderId` — ajoutés à `returnUrl`, et falsifiables : on relit toujours l'intention |

Une saison de septembre à juin tient dans dix mois : au large sous le plafond des
douze, mais **l'intention doit être créée près du moment de l'achat**.

---

## 9. État d'avancement

**Fait.**

- `src/utils/helloasso.ts` — lecture des notifications, clé d'idempotence,
  vérification du jeton. Couvert par `src/utils/__tests__/helloasso.test.ts`.
- `supabase/migrations/20260824210000_helloasso_events.sql` — le journal en ajout
  seul. **Non appliquée.**
- `src/pages/api/helloasso/notifications.ts` — la route de réception.

**Reste à faire.**

1. Appliquer la migration et déclarer `HELLOASSO_WEBHOOK_SECRET`.
2. Le client d'API : création et relecture d'une intention de paiement.
3. Le parcours d'achat du site pour les trois produits.
4. Le provisionnement — comptes, participants, abonnements ou réservations.
5. La file « à traiter » dans l'admin.
6. La table `adhesions` et le rattachement de la commande d'adhésion.

---

## 10. Ce qui reste

**Plus aucune décision de conception en attente.** Les quatre questions ouvertes
ont été tranchées le 24/08/2026 : l'association vend (§1), l'application tient le
registre (§3), l'adhésion est due au seul forfait (§3), et le recouvrement d'une
échéance refusée est assuré par HelloAsso, Checkout compris (§7).

### Les textes : validés, restent à rédiger et à publier

**Isabelle a validé les trois documents le 24/08/2026**, rétractation comprise :
<https://claude.ai/code/artifact/cdf54817-1222-4a4b-ad96-3a3c8971d803>. Ils
doivent encore être rédigés en entier, relus par le conseil de l'association et
publiés — aucun encaissement avant.

| Document | Ce qui change |
| --- | --- |
| Mentions légales | Identifier le vendeur (l'association), ajouter l'hébergeur |
| Politique de confidentialité | Le responsable, les paiements, HelloAsso dans la liste des prestataires |
| Règlement intérieur / CGV | Le règlement d'Isabelle, son article 2 précisé (« aux ateliers réguliers »), plus les mentions dues à un acheteur en ligne |

### Une décision qui engage le code : quatorze jours de rétractation

**Quatorze jours pour tout, sans distinguer le stage daté du forfait de saison.**
C'est le parti le plus lisible pour l'acheteur, et il demande à l'application
trois choses qui n'existent pas :

1. **Dater l'achat** — `subscriptions.created_at` existe, mais la date qui fait
   foi est celle du paiement, à lire sur l'intention.
2. **Rembourser** ce qui a été versé — `POST /payments/{paymentId}/refund`.
3. **Interrompre les échéances à venir** — `POST /orders/{orderId}/cancel`.

**Les deux dernières sont précisément les questions laissées au support
HelloAsso** (§10). Elles ne bloquaient rien tant que la rétractation n'était pas
tranchée ; elles sont maintenant sur le chemin critique.

**Et un cas à écrire.** Le forfait octroie ses crédits dès l'achat
(`20260824250000`) et l'inscription d'office pose des places aussitôt. Quelqu'un
peut donc acheter, venir à une séance, puis se rétracter le dixième jour. Le
texte validé le prévoit — la séance suivie reste due au prix divisé de la
formule, le reste est remboursé — mais le calcul et la libération des places
restantes sont à implémenter.

Le forfait ados a été tranché le 24/08/2026 : **225 € les 9 séances, 396 € les
18** — soit 25 € et 44 € par mois sur neuf mensualités. `formules` et le CMS
étaient donc justes. Le commentaire de la migration `20260824090100`, qui
affirmait « 250 € les 9 séances, 440 € les 18 » et en déduisait les 35 € de la
séance ados, reposait sur deux prémisses aujourd'hui mortes : le prix à l'unité
des créneaux ados est désormais nul et `a_l_unite = false`, la séance à l'unité
n'étant plus proposée qu'aux adultes.
