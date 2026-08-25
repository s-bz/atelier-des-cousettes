# Éprouver le parcours de paiement dans le bac à sable

Le bac à sable de HelloAsso — `helloasso-sandbox.com` — a ses propres
organisations, ses propres clés et des cartes virtuelles. Aucun euro n'y bouge.

C'est le seul endroit où éprouver un paiement de bout en bout : en production,
le moindre essai encaisse réellement, et `POST /payments/{id}/refund` réclame
une authentification forte qu'une clé serveur ne sait pas satisfaire — un
paiement d'essai en production ne se déferait donc pas tout seul.

## Les quatre variables

Elles vont **ensemble** : l'hôte, l'organisation et les clés désignent un seul
et même environnement. En mélanger deux, c'est appeler la production avec
l'organisation d'essai.

| Variable | Bac à sable | Production |
| --- | --- | --- |
| `HELLOASSO_API_HOST` | `https://api.helloasso-sandbox.com` | *(non renseignée)* |
| `HELLOASSO_ORGANISATION` | le slug de l'organisation créée dans le bac à sable | *(non renseignée)* |
| `HELLOASSO_CLIENT_ID` | la clé du bac à sable | la clé de production |
| `HELLOASSO_CLIENT_SECRET` | le secret du bac à sable | le secret de production |

Les deux premières **non renseignées valent production** : le défaut ne peut
pas envoyer un paiement réel vers le bac à sable, c'est l'inverse qui demande un
geste délibéré.

## Où les mettre

**En local** — `.env.local`, à la racine. Suffit pour créer une intention et
lire son URL de paiement.

**Pour aller jusqu'au paiement**, il faut plus que le local : HelloAsso refuse
`localhost`, `127.0.0.1` et le `http` en clair comme URL de retour. Le site
retombe alors sur le domaine public, et le retour du payeur atterrit sur la
production — qui, elle, interroge l'API de production et ne trouvera pas
l'intention créée dans le bac à sable.

Deux façons d'en sortir :

1. **Poser les variables du bac à sable sur le déploiement de production**, le
   temps de l'essai. C'est le plus simple tant que la vente n'est pas ouverte :
   le site fonctionne normalement, simplement il n'encaisse rien. À remettre en
   production ensuite, sans quoi les premières vraies inscriptions seraient
   payées pour de faux.
2. **Une préversion Vercel**, joignable en https. Attention à la protection des
   préversions : HelloAsso doit pouvoir appeler l'URL de notification sans
   jeton de contournement.

## L'URL de notification

À déclarer dans le back-office **du bac à sable**, avec le même chemin et le
même jeton qu'en production :

```
https://<domaine>/api/helloasso/notifications/?jeton=<HELLOASSO_WEBHOOK_SECRET>
```

Un `GET` sur cette URL répond `OK` : le back-office la valide à la saisie, et
une route muette la ferait passer pour morte.

## Ce qu'on vérifie ensuite

```sql
-- La notification est-elle arrivée, et authentifiée ?
select cle, type, authentifie, recu_le, traite_le from helloasso_events
order by recu_le desc limit 5;

-- Et la commande a-t-elle produit ses lignes ?
select a.email, p.first_name, s.formule_id, s.helloasso_order_id
from subscriptions s
join participants p on p.id = s.participant_id
join accounts a on a.id = p.account_id
order by s.created_at desc limit 5;
```

`traite_le` non nul signifie provisionné. Nul, la commande est dans la file
« à traiter » de l'administration, avec sa charge utile — c'est voulu, et jamais
un silence.

## Le ménage

Un essai laisse un compte, un participant, un abonnement et des places posées
d'office — lesquelles occupent de vrais sièges, à trois par séance. À défaire
aussitôt l'essai concluant : supprimer le compte emporte le participant, mais
**pas ses réservations** ni le participant lui-même si le lien est rompu ; on
supprime donc les réservations, puis l'abonnement, puis le compte.
