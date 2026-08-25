# Questions au support HelloAsso

**Association Les P'tits Piafs** — `helloasso.com/associations/les-p-tits-piafs`
Rédigé le 25/08/2026.

## Ce que nous avons construit

Notre site encaisse par **Checkout Intent** (`POST /organizations/{slug}/checkout-intents`),
et non par campagne : le catalogue vit dans notre base, l'intention ne porte qu'un
montant et des `metadata`. Trois produits — un forfait de saison réglé en une fois
ou en mensualités, des stages à la date, des séances à l'unité.

Les contraintes ci-dessous ont été **mesurées contre l'organisation réelle** le
24/08/2026, faute de les avoir trouvées documentées. Les questions qui suivent
sont celles auxquelles nos essais n'ont pas répondu.

---

## 1. La rétractation à quatorze jours — *bloquant*

Nos conditions de vente accordent quatorze jours de rétractation. Trois gestes
nous manquent, et ils sont sur le chemin critique : nous ne pouvons pas ouvrir la
vente en promettant un droit que nous ne saurions pas honorer autrement qu'à la
main.

1. **Rembourser un versement.** L'endpoint `POST /payments/{paymentId}/refund`
   est-il bien celui à employer ? Notre clé porte le scope `RefundManagement`.
2. **Rembourser partiellement.** Le texte que nous avons publié retient le prix
   d'une séance déjà suivie et rembourse le reste. Un remboursement partiel
   est-il possible en une opération — un montant en paramètre — ou faut-il
   rembourser en totalité puis réencaisser ?
3. **Interrompre les échéances à venir sans toucher aux versements déjà
   encaissés.** `POST /orders/{orderId}/cancel` existe-t-il, et est-ce le bon
   geste ? Que devient alors l'échéancier : les prélèvements restants sont-ils
   annulés chez vous, ou faut-il agir sur chaque échéance ?
4. **En être averti.** Un remboursement ou une annulation émet-il une
   notification vers notre URL de rappel, avec quel `eventType` ? À défaut, par
   quel appel constater qu'un remboursement a bien eu lieu ?
5. **Au-delà de quel délai** un paiement cesse-t-il d'être remboursable par
   l'API ?

---

## 2. L'authentification des notifications

Nous recevons les notifications sur une URL publique. À notre connaissance,
**elles ne portent aucune signature** : nous les authentifions donc par un jeton
secret placé en paramètre de l'URL de rappel, comparé en temps constant.

1. **Existe-t-il une signature** (en-tête HMAC, ou autre) permettant de vérifier
   qu'une notification vient bien de vous ? Si oui, comment la calculer ?
2. À défaut, publiez-vous une **liste d'adresses IP** émettrices ?
3. **Politique de reprise** : combien de tentatives, à quel rythme, et sur quels
   codes HTTP considérez-vous une notification comme échouée ? Nous répondons
   200 dès que la charge est journalisée, même si le traitement est différé —
   est-ce le comportement attendu ?
4. **Identifiant d'événement.** Nous déduisons notre clé d'idempotence de la
   charge utile (`Order:12345`), et hachons le contenu lorsqu'aucun identifiant
   n'y figure. Existe-t-il un **identifiant d'événement stable**, distinct de
   celui de la commande, qui nous éviterait ce calcul ?
5. Peut-on **rejouer une notification** depuis le back-office, pour reprendre
   une commande que notre côté aurait manquée ?

---

## 3. La page de paiement

1. **Les coordonnées du payeur.** Nous transmettons `payer` avec le nom saisi
   sur notre site. L'acheteur peut ensuite le modifier sur votre page, et c'est
   sa version qui nous revient. **Peut-on préremplir ces champs en les
   verrouillant**, afin que le nom sous lequel l'inscription a été prise fasse
   foi ?
2. **La contribution facultative.** `containsDonation: false` ne la retire pas
   de la page. **Peut-on la désactiver**, ou l'afficher à zéro par défaut, pour
   une association qui vend une prestation plutôt qu'elle ne collecte un don ?
3. **Un montant nul.** Lorsqu'un code de réduction couvre la totalité, l'API
   refuse l'intention — « Les montants sont invalides ». Nous contournons en
   n'appelant pas HelloAsso dans ce cas, ce qui prive la commande de trace chez
   vous. **Existe-t-il une façon supportée** d'enregistrer une commande à 0 € ?
4. **Une seule ligne d'article.** Nous constatons qu'une intention ne porte
   qu'un `itemName`, le détail passant par `metadata`. Est-ce durable, ou
   plusieurs lignes sont-elles prévues ?
5. **Durée de vie de `redirectUrl`.** Nous mesurons quinze minutes.
   Confirmez-vous, et est-ce paramétrable ?

---

## 4. Un environnement d'essai

`BackUrl` refuse `localhost`, `127.0.0.1` et le `http` en clair, d'un « Le champ
BackUrl est invalide » qui ne dit pas lequel des trois est en cause. Nous
éprouvons donc le parcours **contre la production**, en repliant les URL de
retour sur le domaine public.

1. **Existe-t-il un bac à sable** — une organisation d'essai, un jeu de clés
   distinct — où créer des intentions sans mouvement d'argent ?
2. Si oui, **des numéros de carte d'essai** sont-ils fournis ?
3. À défaut, **peut-on autoriser une URL de retour locale** sur une organisation
   donnée, le temps d'un développement ?

---

## 5. Les règles d'échéancier — confirmation

Mesurées une par une, en soumettant des intentions jusqu'au refus. Nous les avons
encodées telles quelles ; nous aimerions savoir si elles sont **documentées
quelque part** et si elles sont susceptibles de changer sans préavis.

| Règle mesurée | Message obtenu |
| --- | --- |
| Aucune échéance après le **27** du mois | « Aucune échéance après le 27 de chaque mois n'est autorisée » |
| Aucune échéance sur le **mois courant** ni dans le passé | « Aucune échéance n'est autorisée sur le mois courant ou dans le passé » |
| Aucune échéance **au-delà de douze mois** | « Aucune échéance n'est autorisée au delà de 12 mois » |
| Une échéance **par mois au maximum** | (documentation) |
| La **première échéance peut différer** des suivantes | 51 € puis 8 × 36 € accepté |

Une remarque au passage : une **campagne** accepte le 28, là où le Checkout
s'arrête au 27. Cet écart est-il voulu ?

---

## 6. Les échéances refusées

Nous avons compris qu'un prélèvement refusé déclenche un courriel automatique au
payeur, avec un lien de régularisation valable trente jours, et une notification
`eventType: "Payment"`, `state: "Refused"`.

1. **Confirmez-vous que ce recouvrement vaut aussi pour le Checkout**, et pas
   seulement pour les campagnes ?
2. **Que devient la commande** si le payeur ne régularise pas dans les trente
   jours ? Les échéances suivantes sont-elles tout de même présentées ?
3. Sommes-nous **notifiés de la régularisation** lorsqu'elle a lieu ?

---

## 7. Points mineurs

1. **`/partners/me` répond 403.** Nous ne sommes pas client partenaire, et
   réglons donc l'URL de rappel au back-office. Est-ce bien la marche à suivre
   pour une association qui intègre son propre site, ou existe-t-il un statut
   plus adapté ?
2. **Création de tarifs par l'API** : nous constatons qu'elle est impossible, le
   back-office étant seul habilité. Confirmé ?
3. **Les paramètres de retour** (`checkoutIntentId`, `code`, `orderId`) sont
   ajoutés à `returnUrl` et, votre documentation le signale, falsifiables. Nous
   relisons donc systématiquement l'intention par l'API avant d'enregistrer quoi
   que ce soit. Est-ce la pratique que vous recommandez ?
