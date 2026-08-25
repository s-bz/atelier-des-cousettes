# Runbook — quelqu'un s'oppose à la mesure d'audience

**État au 25/08/2026.**

La politique de confidentialité (`/confidentialite/`) fonde la mesure des
inscriptions et des règlements sur l'**intérêt légitime**, et ouvre en
contrepartie un droit d'opposition. L'article 21 du RGPD impose de l'honorer
**pour l'avenir**, et pas seulement d'effacer le passé : effacer une fiche chez
PostHog ne suffit donc pas, il faut aussi empêcher les événements suivants.

Ce document dit comment faire les deux. Compter dix minutes.

## Ce qui déclenche cette procédure

Un courriel à `info@atelier-des-cousettes.fr` demandant, sous une forme ou une
autre, de ne plus être suivi, mesuré, ou de voir ses statistiques supprimées.
Aucune formule sacramentelle n'est exigée : la demande n'a pas à citer le RGPD
pour être valable, et **elle n'a pas à être motivée**.

Le délai de réponse est d'**un mois**, annoncé sur la page. En pratique, la
bascule ci-dessous prend une minute et il n'y a aucune raison d'attendre.

## 1. Vérifier que c'est bien la personne

L'adresse d'où part la demande doit être celle du compte. Si elle diffère, ne
rien faire sans confirmation depuis l'adresse enregistrée : une opposition posée
sur la foi d'un courriel non vérifié permettrait d'effacer les statistiques d'un
tiers.

## 2. Arrêter la mesure pour l'avenir

Dans l'éditeur SQL de Supabase :

```sql
update accounts
   set mesure_refusee = true
 where email = 'adresse@exemple.fr';
```

Vérifier qu'une ligne, et une seule, a été modifiée.

**Effet.** `src/utils/mesure.ts` lit cette liste et n'émet plus aucun événement
nominatif concernant cette personne : ni achat, ni connexion, ni réservation.
Les événements anonymes — un paiement qu'on n'a pas su rattacher, donc sans
adresse — continuent de partir : ils ne désignent personne.

**Délai de prise d'effet : jusqu'à dix minutes.** La liste est gardée en mémoire
par chaque instance du serveur pour ne pas ajouter une requête à chaque
paiement. Rien à faire pour l'accélérer ; il suffit de le savoir avant de
vérifier que ça marche.

## 3. Effacer ce qui a déjà été envoyé

Dans PostHog (cloud UE) → **People** → chercher l'adresse → **Delete person**.
Cocher la suppression des événements associés.

C'est irréversible, et c'est le but.

## 4. Répondre

Confirmer les deux gestes séparément — la mesure cesse, les données passées sont
supprimées — et rappeler que cela ne change rien à l'inscription, à l'accès à
l'espace adhérent, ni aux courriels du service, qui relèvent du contrat et non
de la mesure.

## Revenir en arrière

```sql
update accounts set mesure_refusee = false where email = 'adresse@exemple.fr';
```

À ne faire que sur demande explicite de la personne elle-même. Les données
supprimées à l'étape 3, elles, ne reviennent pas.

## Ce que cette procédure ne couvre pas

- **La mesure d'audience du navigateur** : elle est sans cookie et ne désigne
  personne, il n'y a donc rien à en retirer. Voir `src/layouts/BaseLayout.astro`.
- **Une demande d'effacement complet du compte**, qui est autre chose et emporte
  la fin de l'inscription. Ne pas confondre les deux : quelqu'un qui refuse
  d'être mesuré ne demande pas à quitter l'atelier.
