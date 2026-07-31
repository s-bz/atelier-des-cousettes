# Runbook — les couvertures d'articles de blog

Comment sont faites les vingt-deux images de couverture du blog, et comment en
produire une vingt-troisième qui ne jure pas avec les autres.

## Ce qu'elles sont, et ce qu'elles ne sont pas

Ces images sont **générées** (Nano Banana / Gemini 3.1 Flash Image), le 31/07/2026.
Ce ne sont **pas** des photographies de l'atelier de Verdalle, ni des pièces
cousues par Isabelle. C'est un choix assumé et réversible : le blog n'avait
aucune image, donc aucune présence dans Google Images, aucun `image` dans le
schéma `Article`, et une seule et même vignette de partage pour vingt-deux
articles.

**Trois interdits en découlent**, et ils ne sont pas négociables :

1. **Aucune personne, aucun visage, aucune main reconnaissable.** Une photo
   générée qui laisserait croire qu'on voit Isabelle, une élève ou un atelier
   réel serait un mensonge sur l'auteur — exactement ce que l'E-E-A-T cherche à
   mesurer. Les images ne montrent que des objets.
2. **Aucune pièce présentée comme une réalisation de l'atelier.** Les objets
   cousus sont des illustrations du sujet de l'article, jamais des créations
   attribuables. Ce qui est attribuable vit dans `/mes-creations/`, et ce sont
   de vraies photos.
3. **Le texte alternatif décrit l'image, pas l'article.** Il est lu par les
   lecteurs d'écran et par Google : il doit dire ce qu'on voit. Vérifiez
   l'image avant d'écrire l'alt — sur les vingt-deux, un alt annonçait « un bord
   de tissu surjeté net » que l'image ne montrait pas, et il a fallu le corriger.

**Le jour où Isabelle fournit de vraies photos**, elles remplacent les images
générées sans toucher au code : un champ « Image de couverture » par article dans
Keystatic, et l'alt à réécrire. Préférez-les toujours : une vraie photo d'atelier
vaut mieux, pour la confiance comme pour le référencement.

## Le style, mot pour mot

Le style est le même pour les vingt-deux images — c'est ce qui fait qu'elles se
lisent comme une série et non comme vingt-deux emprunts. **Ne le paraphrasez
pas : recopiez-le.** Il est en anglais parce que le modèle y répond mieux, et
parce que c'est la chaîne exacte qui a produit ces images.

```text
Editorial still-life photograph, wide landscape composition. Natural soft
daylight from a window, warm neutral palette of beige, cream, soft coral and
dusty pink. Shallow depth of field, shot on a pale wooden table or natural linen
cloth. Calm, uncluttered, artisanal atmosphere of a small French sewing
workshop. No people, no faces, no hands with visible identity, no text, no
lettering, no logos, no watermarks, no brand names.
```

La palette n'est pas décorative : beige, crème, corail doux et rose poudré sont
les couleurs du site (`src/styles/global.css`). Une couverture bleu vif ou
saturée se verrait comme une pièce rapportée dans la liste du blog.

Le prompt complet se monte toujours ainsi :

```text
Create an image of: <SUJET>. Style: <LE BLOC CI-DESSUS>
```

Le `<SUJET>` est une phrase courte, concrète, au présent, qui nomme des objets
et rien d'autre — pas d'adjectif d'ambiance (le bloc de style s'en charge), pas
de nom de marque, pas de mise en scène narrative.

## La commande

```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Create an image of: <SUJET>. Style: <BLOC DE STYLE>" \
  --filename "/tmp/covers/<slug>.png" \
  --resolution 2K
```

`2K` suffit et c'est délibéré : la sortie fait 2752 × 1536, le hero n'affiche
jamais plus de 1440 de large (`widths={[640, 1024, 1440]}` dans `Hero.astro`).
Générer en 4K coûterait plus cher pour des pixels qu'Astro jette.

## De l'image générée au dépôt

Le PNG brut ne va **jamais** dans `src/assets/` : 22 PNG 2K pèseraient plus de
100 Mo. On le réduit et on le convertit une fois pour toutes.

```js
await sharp(png)
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 86 })
  .toFile('src/assets/images/blog/<slug>/cover.webp');
```

1600 px de large et qualité 86 pour la **source** : Astro réencode ensuite en
webp qualité 60 pour le rendu, et compresser deux fois de suite une image déjà
trop compressée se voit. Les vingt-deux couvertures pèsent **3,7 Mo au total**.

Le script `sharp` doit tourner **depuis la racine du dépôt** — lancé depuis
`/tmp`, l'import échoue en `ERR_MODULE_NOT_FOUND`, `sharp` vivant dans le
`node_modules` du projet.

## Où le fichier se pose, et ce qu'on écrit dans l'article

Chemin sur le disque, un dossier par article :

```
src/assets/images/blog/<slug>/cover.webp
```

Frontmatter de `src/content/blog/<slug>/index.mdoc` :

```yaml
coverImage: /src/assets/images/blog/<slug>/cover.webp
coverImageAlt: Description de ce qu'on voit sur l'image, en français
```

Le dossier `<slug>/` est un **vrai dossier**, comme pour la collection
`creations` (`creations/creation-chapeau/image.jpg`). C'est la convention des
collections Keystatic, et elle permet à `resolveImage()` de trouver le fichier
par correspondance directe, sans passer par son repli sur le nom de fichier seul.

### Le piège qui a coûté vingt-deux images invisibles

`src/pages/blog/[slug].astro` doit globber **les deux** dossiers :

```js
const coverGlob = import.meta.glob<{ default: ImageMetadata }>([
  '/src/assets/images/covers/**/*.{jpg,jpeg,png,webp}',
  '/src/assets/images/blog/**/*.{jpg,jpeg,png,webp}',
]);
```

Le motif ne lisait que `covers/`, alors que le champ Keystatic écrit dans
`blog/`. `resolveImage()` renvoyait `null`, et `null` ne casse rien : pas de
balise `<img>`, pas d'`image` dans le schéma `Article`, l'og:image qui retombe
sur `/og-default.jpg`. L'avertissement n'existe qu'en développement. **On
pouvait donc téléverser vingt-deux couvertures depuis le CMS et n'en voir
aucune, sans un seul message d'erreur.** Si une couverture n'apparaît pas,
c'est la première chose à vérifier.

Après avoir remplacé un fichier image à chemin constant, videz le cache
d'images : `rm -rf node_modules/.astro .astro`.

## Vérifier qu'une couverture est bien branchée

Quatre choses doivent être vraies dans le HTML construit — les quatre, pas
trois :

```bash
pnpm build
# puis, pour l'article visé, dans dist/client/blog/<slug>/index.html :
#   1. une balise <img> existe
#   2. son attribut alt n'est pas vide
#   3. le schéma Article porte une clé "image"
#   4. og:image ne pointe PAS vers /og-default.jpg
```

## Les vingt-deux sujets, tels qu'ils ont été demandés

À garder pour régénérer une image sans réinventer son cadrage, et pour éviter
que deux articles finissent avec la même nature morte.

| slug | sujet (`<SUJET>` du prompt) |
|---|---|
| `choisir-fil-aiguille` | wooden spools of sewing thread in muted colours beside an open packet of assorted sewing machine needles |
| `choisir-machine-a-coudre` | a domestic sewing machine seen three-quarters on, a folded piece of cotton fabric under its presser foot |
| `comprendre-patrons-couture` | tissue-paper sewing pattern sheets covered in printed lines and symbols, a tracing wheel and pattern weights resting on top |
| `coudre-jupe-elastiquee-premier-vetement` | a length of soft printed cotton folded beside a roll of wide white elastic and a safety pin, a simple gathered skirt half assembled |
| `coudre-ourlet-invisible` | extreme close-up of a fine needle making a small blind hem stitch in the fold of a soft grey fabric |
| `coudre-tote-bag` | a plain natural canvas tote bag partly assembled, its two straps pinned in place, next to scissors |
| `coudre-trousse-fermeture-eclair` | a small flat zipped pouch in printed cotton, a separate metal zip and its pull lying beside it |
| `couture-enfants-projets-faciles` | brightly coloured felt squares and cotton scraps, large blunt-tipped childrens scissors and a wooden button jar |
| `couture-ete-accessoires-vacances` | summery sewn accessories laid out together, a light cotton sun hat, a drawstring pouch and a folded striped beach towel |
| `couture-zero-dechet-projets-pratiques` | a stack of reusable cloth make-up wipes, a cotton bulk food bag with a drawstring, and a folded fabric wrap |
| `coutures-de-base` | several small samples of white cotton fabric each showing a different machine seam, laid in a neat row |
| `debuter-couture-conseils` | a beginners sewing kit laid out flat, small scissors, a pincushion with pins, two spools of thread and a tape measure |
| `entretenir-machine-a-coudre` | the needle plate area of a sewing machine opened for cleaning, a small stiff brush and a slim bottle of machine oil beside it |
| `erreurs-debutant-couture` | a puckered wavy machine seam in pale fabric being unpicked with a seam ripper, loose thread ends scattered |
| `idees-cadeaux-couture-faits-main` | a group of small handmade fabric gifts, zipped pouches and a folded apron, loosely tied with kraft paper and twine |
| `organiser-espace-couture` | a tidy corner of a sewing room, a wall-mounted thread rack, glass jars of buttons and folded fabric stacked on open shelves |
| `points-couture-main-essentiels` | a piece of natural linen worked with several different hand embroidery and sewing stitches in dark thread, a threaded needle resting on it |
| `prendre-ses-mesures` | a soft yellow tape measure draped in a loose curve beside a small open notebook with pencil |
| `retouches-simples-ourlet-bouton-fermeture` | a mending set up, a trouser leg with its hem turned and pinned, a card of spare buttons and a short zip |
| `surjeteuse-a-quoi-ca-sert` | an overlocker serger machine threaded with four cones of thread in soft colours, a fabric edge neatly overlocked |
| `tissus-debutants` | a neat stack of folded dressmaking fabrics in cotton, linen and poplin, in cream, sand and dusty blue tones |
| `trousse-couture-indispensables` | the contents of a sewing kit arranged flat and evenly spaced, scissors, thimble, seam ripper, pins, tape measure and thread |

*Note de reproductibilité : la première image (`choisir-fil-aiguille`) a été
produite avec une variante du bloc de style à laquelle manquaient « no hands with
visible identity » et « no brand names ». Le résultat est indistinguable ; c'est
la version complète ci-dessus qui fait référence.*

## Si vous voulez déclarer que l'image est générée

Google accepte la métadonnée IPTC `digitalSourceType: trainedAlgorithmicMedia`,
qui dit explicitement « image produite par un modèle ». Elle n'est pas posée
aujourd'hui. Ce n'est pas une obligation, et elle n'est pas connue pour peser sur
le classement — mais c'est le geste honnête si le blog continue longtemps avec
des couvertures générées.
