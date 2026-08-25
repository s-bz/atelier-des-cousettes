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

## 3. Vérifier qu'une notification vient bien de vous

Nous recevons les notifications sur une URL publique, déclarée au back-office.
Nous les authentifions aujourd'hui par un **jeton secret placé en paramètre de
l'URL**, comparé en temps constant — faute d'avoir trouvé mieux.

Or le modèle `ApiUrlNotificationModel` du contrat porte un champ
**`signatureKey`**, sous `/partners/me/api-notifications`. Cet endpoint nous
répond **403** : nous ne sommes pas client partenaire, mais une association qui
intègre son propre site.

1. **Comment obtenir et vérifier cette signature en tant qu'association ?**
   Est-elle réservée aux partenaires ?
2. Si elle nous est inaccessible, **le jeton en paramètre d'URL est-il la
   pratique que vous recommandez**, ou existe-t-il autre chose ?
3. **Politique de reprise** : combien de tentatives, à quel rythme, et sur quels
   codes HTTP considérez-vous une notification comme échouée ? Nous répondons
   200 dès que la charge est journalisée, même si le traitement est différé.
4. **Un remboursement ou une annulation émet-il une notification ?** Les types
   déclarés sont `Payment`, `Order`, `Form`, `Organization` ; nous ne savons pas
   lequel porte un remboursement, ni quel `state` le distingue.
5. Peut-on **rejouer une notification** depuis le back-office, pour reprendre
   une commande que notre côté aurait manquée ?
