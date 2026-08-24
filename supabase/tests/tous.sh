#!/usr/bin/env bash
# Exécute toutes les suites SQL et échoue si l'une d'elles régresse.
#
# Écrit après avoir découvert que deux suites ne s'exécutaient plus depuis
# plusieurs jours : une colonne supprimée les faisait échouer AU PARSE, donc
# sans produire un seul « ECHEC » — et lancer les suites une par une, au gré de
# ce qu'on venait de modifier, ne le révélait pas. Un test qui ne tourne plus
# est pire qu'un test qui échoue : il continue d'être compté.
#
#   ./supabase/tests/tous.sh
set -uo pipefail
cd "$(dirname "$0")/../.."

# Nombre d'assertions attendu par suite. Un écart signale soit une régression,
# soit un test ajouté sans mettre ce chiffre à jour — les deux méritent qu'on
# s'arrête.
declare -a SUITES=(
  "credits:10"
  "bookings:16"
  "autorisation:5"
  "facturation:8"
  "auto-inscription:8"
  "public-enfants-adultes:4"
  "forfaits:7"
)

total=0
echec=0

for entree in "${SUITES[@]}"; do
  nom="${entree%%:*}"
  attendu="${entree##*:}"

  sortie=$(perl -e 'alarm 240; exec @ARGV' \
    supabase db query --linked -f "supabase/tests/${nom}.sql" </dev/null 2>&1)

  # Une erreur SQL ne produit aucun verdict : c'est le cas qu'il faut attraper.
  if echo "$sortie" | grep -q '"_tag":"Error"'; then
    echo "  ✗ ${nom} — la suite n'a pas pu s'exécuter"
    echo "$sortie" | grep -oE 'ERROR:[^\\]*' | head -1 | sed 's/^/      /'
    echec=1
    continue
  fi

  obtenus=$(echo "$sortie" | grep -cE '"OK')
  rates=$(echo "$sortie" | grep -cE '"ECHEC')

  if [ "$rates" -gt 0 ]; then
    echo "  ✗ ${nom} — ${rates} assertion(s) en échec"
    echo "$sortie" | grep -E '"ECHEC' | head -3 | sed 's/^/      /'
    echec=1
  elif [ "$obtenus" -ne "$attendu" ]; then
    echo "  ✗ ${nom} — ${obtenus} assertions, ${attendu} attendues"
    echec=1
  else
    echo "  ✓ ${nom} — ${obtenus}"
    total=$((total + obtenus))
  fi
done

echo
if [ "$echec" = "0" ]; then
  echo "→ ${total} assertions SQL, toutes vertes"
else
  echo "→ suites en échec"
  exit 1
fi
