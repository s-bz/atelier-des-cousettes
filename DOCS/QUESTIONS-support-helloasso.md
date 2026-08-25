# Questions au support HelloAsso

**Association Les P'tits Piafs** — `helloasso.com/associations/les-p-tits-piafs`
Rédigé le 25/08/2026, resserré le même jour après lecture de
`api.helloasso.com/v5/swagger/public/swagger.json`.

## Ce que nous avons construit

Notre site encaisse par **Checkout Intent** (`POST /organizations/{slug}/checkout-intents`),
et non par campagne : le catalogue vit dans notre base, l'intention ne porte qu'un
montant et des `metadata`. Trois produits — un forfait de saison réglé en une fois
ou en mensualités, des stages à la date, des séances à l'unité.

## Ce qui est déjà résolu

La lecture du contrat OpenAPI et votre réponse sur l'environnement d'essai ont
répondu à l'essentiel de nos questions. Nous les retirons d'ici pour ne laisser
que ce qui reste ouvert :

- **Un bac à sable existe** — `helloasso-sandbox.com`, API sur
  `api.helloasso-sandbox.com/v5`, cartes virtuelles fournies. Nous y basculons
  nos essais ; nous éprouvions le parcours contre la production faute de le
  connaître.
- **Rembourser** : `POST /payments/{paymentId}/refund`, avec `amount` en
  centimes pour un remboursement partiel, `comment`, et `sendRefundMail`.
- **Interrompre les échéances à venir** : `POST /orders/{orderId}/cancel`, ou
  `cancelOrder=true` sur un remboursement.

---

## 1. Rembourser sans intervention humaine — *bloquant*

Nos conditions de vente accordent quatorze jours de rétractation. Nous voudrions
l'honorer depuis notre application, sans qu'Isabelle ait à ouvrir le back-office
à chaque demande.

Or la documentation de `POST /payments/{paymentId}/refund` indique :

> **This endpoint is protected with strong authentication.** When called, it will
> return an error indicating how the user must authenticate in order to validate
> the operation.

avec des en-têtes `x-mfa-access-authorization`, `x-mfa-sms-access-authorization`
et `x-mfa-password-authorization`.

1. **Un serveur peut-il rembourser sans interaction humaine ?** Notre clé est de
   type `client_credentials`, sans utilisateur derrière : personne ne recevra le
   SMS ni ne saisira le mot de passe. Existe-t-il un mode d'authentification
   adapté à une intégration serveur — un jeton de longue durée, une exemption
   sur une clé donnée ?
2. À défaut, **quel est le parcours prévu** ? Isabelle rembourse à la main dans
   le back-office et notre application se contente de le constater ?
3. **`POST /orders/{orderId}/cancel` est-il soumis à la même
   authentification forte ?** Sa description ne la mentionne pas, ce qui laisse
   penser que non — nous préférons en être sûrs avant de bâtir dessus.

---

## 2. Rembourser partiellement une commande échelonnée

Notre cas concret : quelqu'un achète un forfait de saison en neuf mensualités,
vient à une séance, puis se rétracte au dixième jour. Le texte que nous avons
publié retient le prix de la séance suivie et rembourse le reste — donc **un
remboursement partiel ET l'arrêt des échéances à venir**.

1. Le paramètre `amount` porte la mention « Enter this amount only for a partial
   refund **for stripe** ». **Le remboursement partiel dépend-il donc du
   prestataire** qui a encaissé ? Comment savoir, pour un paiement donné, s'il
   est éligible ?
2. `cancelOrder` est décrit comme « possible only if the payment is fully
   refunded ». **Comment combiner un remboursement partiel et l'arrêt des
   échéances à venir ?** Faut-il appeler `/orders/{id}/cancel` d'abord, puis
   rembourser partiellement le versement déjà encaissé ?
3. Sur un échéancier, `paymentId` désigne **un versement**, pas la commande :
   confirmez-vous qu'il faut rembourser versement par versement ?
4. **Au-delà de quel délai** un versement cesse-t-il d'être remboursable ?

---

## 3. Les notifications : ce que le contrat dit, et ce qu'il tait

Le contrat OpenAPI documente la configuration, non le fonctionnement :

| Ce qu'on y trouve | |
| --- | --- |
| `ApiNotificationType` | quatre valeurs : `Payment`, `Order`, `Form`, `Organization` |
| `ApiUrlNotificationModel` | porte un champ **`signatureKey`** — « allows you to verify the authenticity of notifications » |
| `PUT` / `DELETE /partners/me/api-notifications` | pour declarer ou retirer l'URL |

Et ce qu'il ne dit pas : **la forme de la charge utile**, **quand** une
notification part, et **comment obtenir la cle de signature**.

1. **`signatureKey` : comment la lire ?** Il n'existe aucun `GET` sur ces
   routes — nous obtenons `405 Method Not Allowed`, et non `403`, ce qui
   indique que notre jeton y est pourtant accepte. Faut-il la relever au
   back-office ? Est-elle rendue par le `PUT` ? A defaut, nous authentifions
   par un jeton secret place en parametre de l'URL de rappel : est-ce ce que
   vous recommandez ?

2. **Quels evenements declenchent une notification ?** Mesure le 25/08/2026 :
   un paiement autorise en emet une (`Payment`, avec `state`,
   `refundOperations` et l'`order`) ; **l'annulation de neuf echeances n'en a
   emis aucune**. Un remboursement en emet-il une ? La liste des quatre types
   ne distingue pas le remboursement, ce qui laisse penser qu'il arriverait en
   `Payment` — a confirmer.

3. **Le meme paiement change d'etat au fil de sa vie** — autorise, puis
   rembourse — en gardant son identifiant. Nous distinguons ces annonces par
   `data.meta.updatedAt`. Est-ce l'usage prevu, ou existe-t-il un identifiant
   d'evenement propre ?

4. **Politique de reprise** : combien de tentatives, a quel rythme, sur quels
   codes HTTP ? Nous repondons 200 des que la charge est journalisee, meme si
   le traitement est differe.

5. **Peut-on rejouer une notification** depuis le back-office ?

---

## 3 bis. Les echeances annulees sont invisibles hors de la commande

Constate sur un cas reel : neuf echeances passees a `Canceled`.

- `GET /orders/{id}` les montre toutes, correctement.
- `GET /organizations/{slug}/payments` **ne les montre pas**, quel que soit le
  filtre — avec ou sans `states`, avec ou sans dates, quel que soit le tri.
  Elle continue de ne rendre que les paiements `Authorized`.
- `states=Canceled` y est pourtant **accepte** : l'API valide ce parametre et
  refuse une valeur inventee par un `400`. Elle rend donc zero resultat sans
  rien signaler — une reponse valide qui ne dit rien.

**Est-ce voulu ?** Nous interrogeons desormais chaque commande une par une,
faute de mieux. Une liste d'organisation qui rendrait aussi les echeances
annulees nous epargnerait N appels par nuit.

