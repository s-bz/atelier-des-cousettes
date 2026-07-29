#!/usr/bin/env bash
# Test de concurrence sur book_participant.
#
# C'est la seule raison pour laquelle ces opérations sont des fonctions SQL et
# non du code applicatif : « compter les places puis insérer » depuis Astro est
# une séquence non atomique. Deux requêtes simultanées peuvent chacune voir
# « il reste une place » et insérer toutes les deux.
#
# On lance N paires de réservations réellement parallèles sur une séance à UNE
# place, et on exige qu'exactement une réussisse à chaque tour.
#
# Portée de la preuve : un échec démontre l'absence de sérialisation ; une
# réussite ne la démontre pas formellement (la fenêtre de course peut ne pas
# s'ouvrir). Plusieurs tours rendent le faux positif improbable.
#
#   ./supabase/tests/concurrence.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

TOURS=${1:-4}

# Le garde-temps est large à dessein. Trop court, il tue l'un des deux appels
# concurrents : le tour se solde alors par « 1 réservation » et paraît vert
# alors qu'aucune course n'a eu lieu. Un test de concurrence qui se sabote
# lui-même en silence est pire que pas de test.
q() { perl -e 'alarm 240; exec @ARGV' supabase db query --linked "$1" </dev/null 2>/dev/null; }

nettoyer() {
  q "delete from bookings where participant_id in
       ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002');
     delete from sessions      where creneau_id = 'z-concurrence';
     delete from participants  where id in
       ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002');
     delete from creneaux      where id = 'z-concurrence';" >/dev/null
}
trap nettoyer EXIT

# Les identifiants de test sont fixes. Deux exécutions simultanées se
# détruiraient mutuellement : le trap de l'une supprime les données de l'autre,
# et le tour en cours affiche « 0 réservation » — un faux échec très
# convaincant. On refuse plutôt de démarrer.
if q "select count(*) as n from creneaux where id='z-concurrence';" | grep -qE '"n": *[1-9]'; then
  echo "ERREUR : des données de test subsistent (z-concurrence)."
  echo "Une autre exécution est en cours, ou la précédente a été interrompue."
  echo "Attendre la fin, ou nettoyer à la main avant de relancer."
  trap - EXIT
  exit 1
fi

q "insert into creneaux (id,label,group_id,default_start_time,default_end_time,
                         default_location,default_capacity,default_unit_price_cents)
   values ('z-concurrence','Test concurrence','revel-adultes','14:00','17:00','Revel',1,2500);
   insert into participants (id,first_name,last_name) values
     ('c0000000-0000-0000-0000-000000000001','Course','Un'),
     ('c0000000-0000-0000-0000-000000000002','Course','Deux');" >/dev/null

echec=0
for tour in $(seq 1 "$TOURS"); do
  SID="5c000000-0000-0000-0000-00000000000$tour"
  q "insert into sessions (id,creneau_id,starts_at,ends_at,location,capacity,unit_price_cents)
     values ('$SID','z-concurrence','2026-11-0$tour 14:00+01','2026-11-0$tour 17:00+01','Revel',1,2500);" >/dev/null

  # Les deux appels partent en parallèle : deux requêtes HTTP, donc deux
  # sessions Postgres distinctes.
  q "select book_participant('$SID','c0000000-0000-0000-0000-000000000001','member');" >/dev/null &
  q "select book_participant('$SID','c0000000-0000-0000-0000-000000000002','member');" >/dev/null &
  wait

  n=$(q "select count(*) as n from bookings where session_id='$SID' and status='booked';" \
      | grep -oE '"n": *[0-9]+' | grep -oE '[0-9]+')

  if [ "$n" = "1" ]; then
    echo "tour $tour : OK    — 1 réservation retenue sur 2 tentatives simultanées"
  else
    echo "tour $tour : ECHEC — $n réservations sur une séance à 1 place"
    echec=1
  fi
done

[ "$echec" = "0" ] && echo "→ la capacité tient sous concurrence" || { echo "→ SURRÉSERVATION POSSIBLE"; exit 1; }
