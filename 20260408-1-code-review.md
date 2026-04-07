# Code Review — 2026-04-08 (Itération 1)

**Scope :** Commit `6e18279` — refactoring DRY + accessibilité + validation (session du 7-8 avril 2026)  
**Reviewer :** Claude Opus 4.6  
**Fichiers examinés :** 28 fichiers modifiés (voir `git diff HEAD~1 --name-only`)

---

## Résumé des changements

Cette session a couvert quatre axes distincts :

1. **DRY — Composants partagés** : Création de `IntroSection` et `CrossLinksSection`, extraction de `getPageContext()`, `getCrossLinks()`, `splitParagraphs()`, `splitLines()`, `buildBreadcrumbSchema()`, `isValidFaqItem()`.
2. **Harmonisation des images** : `Hero` passe de `coverImage?: string` (résolution interne) à `coverImage?: ImageMetadata` (pré-résolu par l'appelant), alignant le contrat de tous les composants image.
3. **Accessibilité** : Lien « aller au contenu », sémantique footer (`nav > ul > li`), `aria-label` sur les cards, correction de hiérarchie `h3 → h2`.
4. **Validation et robustesse** : Regex Keystatic sur les champs `price`, `min: 0` sur `order`, filtre `isValidFaqItem()`, warn dev sur `resolveImage()` sans résultat.

---

## Problèmes critiques

Aucun problème bloquant ni vulnérabilité de sécurité détecté.

---

## Préoccupations architecturales

### 1. ~~`isValidFaqItem` filtrée deux fois dans `buildServicePageSchemas`~~ ✅ CORRIGÉ

Doublon `faqItems.filter(isValidFaqItem)` extrait en variable locale `validFaqItems`.

### 2. ~~`siteUrl` peut être une chaîne vide sans avertissement~~ ✅ CORRIGÉ

Ajout d'un `console.warn` en mode dev lorsque `Astro.site` est undefined.

### 3. ~~`CrossLinksSection` : couplage implicite avec `SERVICE_LINKS`~~ ✅ CORRIGÉ

JSDoc mis à jour pour documenter le risque de self-link quand `excludeHref` est omis.

### 4. `ContentPage.astro` — contrat `contentClass` non documenté

**Fichier :** [src/components/ContentPage.astro](src/components/ContentPage.astro#L47)

```astro
<div class={`${contentClass || 'max-w-3xl'} mx-auto px-4 prose overflow-visible`}>
```

Le prop `contentClass` remplace la classe `max-w-*` entière mais force `prose` et `overflow-visible`. Un appelant passant `contentClass="max-w-5xl prose-lg"` doublerait `prose`. Le commentaire dans l'interface serait utile.

---

## Qualité de code

### Positif — Le ratio signal/bruit a nettement baissé

Avant le refactoring, les pages service avaient ~15 lignes de boilerplate identiques chacune (settings + siteUrl + crossLinks + splitParagraphs). Après : 1 appel à `getPageContext()` et un composant `<CrossLinksSection>`. Les pages sont désormais lisibles d'un seul coup d'œil.

### `splitParagraphs` — comportement sur texte vide

**Fichier :** [src/utils/strings.ts](src/utils/strings.ts#L20-L22)

```ts
export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);
}
```

Le `filter(Boolean)` protège contre les chaînes vides après trim — c'est correct. Cependant, un texte contenant uniquement des espaces retourne `[]`, ce qui est le bon comportement. Pas de problème, mais la fonction remplace les sauts de ligne *internes* par des espaces (`p.replace(/\n/g, ' ')`). Cela signifie qu'une ligne intentionnellement courte dans un paragraphe (ex : vers de poème) sera fusionnée. Pour ce projet (prose couture), c'est acceptable, mais mériterait un commentaire si l'usage évolue.

### ~~`isValidFaqItem` définie avant ses types~~ ✅ CORRIGÉ

`isValidFaqItem` déplacée après les déclarations d'interface dans `schema.ts`.

### `nav.ts` vs `navLinks.ts` — duplication de module

**Fichiers :** [src/utils/nav.ts](src/utils/nav.ts) et [src/utils/navLinks.ts](src/utils/navLinks.ts)

Ces deux fichiers coexistent avec des objectifs chevauchants : `navLinks.ts` exporte les liens de navigation principale, `nav.ts` exporte `SERVICE_LINKS` et `getCrossLinks`. Pour une codebase de cette taille, un seul fichier `nav.ts` contenant tout serait plus clair — mais la séparation actuelle est défendable si `navLinks` reste volontairement distinct des liens cross-service.

### `Hero.astro` — `preloadImage` injecte une `<link>` hors `<head>`

**Fichier :** [src/components/Hero.astro](src/components/Hero.astro#L21-L23)

```astro
{preloadImage && (
  <link rel="preload" as="image" type="image/webp" href={preloadImage.src} />
)}
```

La balise `<link rel="preload">` est émise directement dans le corps du document (Astro l'hoiste en `<head>` automatiquement via le mécanisme de "head injection"), ce qui est correct. Mais si le comportement d'Astro change, cela pourrait générer un `<link>` dans le body. Pour la robustesse, utiliser `<slot name="head">` de `BaseLayout` (via la page parente) serait plus explicite — bien que la solution actuelle soit courante et fonctionnelle.

---

## Sécurité

### `set:html` sur Markdoc — commentaire de sécurité bien en place

**Fichiers :** [src/pages/blog/[slug].astro](src/pages/blog/[slug].astro#L23-L25), [src/components/ContentPage.astro](src/components/ContentPage.astro#L22)

Le commentaire explicite sur la confiance de la source et l'absence de sanitisation est exact et utile. La posture est correcte : éditeur unique de confiance via Keystatic. Aucune action requise.

### JSON-LD — échappement `<\/` bien appliqué

Tous les blocs `set:html={JSON.stringify(...).replace(/<\//g, '<\\/')}` protègent contre l'injection de fermeture de balise script. Présent de façon cohérente dans toutes les pages.

### `safeHref` dans `ServiceCard`

```ts
const safeHref = href?.startsWith('/') ? href : '#';
```

Bon réflexe contre les valeurs inattendues. Cohérent avec le contrat de l'interface.

---

## Tests

Le projet n'a pas de suite de tests unitaires identifiée. Pour les utilitaires ajoutés, les candidats prioritaires seraient :

- `splitParagraphs` — cas limites : texte vide, un seul paragraphe, sauts de ligne Windows (`\r\n\r\n`)
- `toSlug` — caractères accentués composés, tirets consécutifs, chaîne vide
- `buildBreadcrumbSchema` — vérification que `position` démarre à 1, que l'item final n'a pas de `"item"` field

Ces fonctions pures sont triviales à tester et les couvertures seraient de vraie valeur (les bugs de slug cassent les ancres, les bugs de breadcrumb invalident le SEO).

---

## Observations positives

- **`getPageContext()`** est l'une des meilleures améliorations de la session : simple, sans surprise, testé implicitement sur 8 pages.
- **`buildBreadcrumbSchema()`** — l'API `{ name, url? }[]` est idiomatique, les types sont précis, la fonction est pure.
- **`resolveImage()` avec warn dev** — traçabilité sans bruit en production. Bonne pratique d'observabilité.
- **`IntroSection`** avec `<slot />` entre le texte et le CTA est une décision de design flexible : `un-apres-midi-couture` peut injecter ses badges sans modifier le composant.
- **Suppression des `style="font-family: var(--font-heading)"`** : remplacer 33 occurrences inline par `.heading-font` réduit le risque d'oubli sur de futurs composants.
- **Footer `nav > ul > li`** : correction de la sémantique HTML correcte — les listes de liens de navigation doivent être dans un `<ul>`.
- **`aria-label` sur les cards** : les liens cartes sans texte explicite bénéficient directement du `label` passé par la page.

---

## Feedback fichier par fichier

### [src/utils/schema.ts](src/utils/schema.ts)

- ~~**L10** : déplacer `isValidFaqItem` après les déclarations d'interface (lisibilité)~~ ✅
- ~~**L130-145** : extraire `faqItems.filter(isValidFaqItem)` en variable locale (doublon)~~ ✅
- **L93** : `"sameAs": settings?.facebookUrl ? [settings.facebookUrl] : []` — correct, mais si `facebookUrl` est `null` (non fourni en Keystatic), l'URL `null` ne serait pas incluse grâce à l'opérateur ternaire. OK.

### [src/utils/reader.ts](src/utils/reader.ts)

- ~~**L12** : envisager un warn dev si `site` est undefined (cf. §2 ci-dessus)~~ ✅

### [src/components/CrossLinksSection.astro](src/components/CrossLinksSection.astro)

- ~~**L9** : documenter le comportement quand `excludeHref` est omis~~ ✅

### [src/components/Hero.astro](src/components/Hero.astro)
- **L17** : `getImage()` appelé sans `sizes` ni `formats` supplémentaires pour le preload — fonctionne, mais `sizes="100vw"` ajouté ici aussi serait cohérent avec la balise `<Image>` en dessous (L34)

### [src/components/Footer.astro](src/components/Footer.astro)
- **L66-68** : `new Date().getFullYear()` via `<script>` inline — correcte pour éviter l'année de build figée. Pas de problème.
- ~~**L24-28** : `phone.replace(/[.\s]/g, '')` dans le `href` — tirets non supprimés~~ ✅ Regex mise à jour vers `/[-.\s]/g`.

### [src/pages/index.astro](src/pages/index.astro)
- N'utilise pas `getPageContext()` — cohérent car la homepage nécessite `settings` séparément pour plusieurs usages (geo, schémas inline, etc.). Pas un oubli.

### [src/pages/blog/[slug].astro](src/pages/blog/[slug].astro)
- Utilise `getPageContext()` et `buildBreadcrumbSchema()` — migration complète, bien.
- Les articles connexes sont récupérés par date desc sans tenir compte des tags/catégories. Pour 3-5 articles c'est acceptable ; à revoir si la base d'articles grossit.

### [keystatic.config.ts](keystatic.config.ts)
- **L19** : regex `/^\d+(\.\d{1,2})?$/` — valide `0` et `0.50`. Accepter `0` est intentionnel (activités gratuites possible) ? Si le prix minimum est `1`, la regex devrait être `/^[1-9]\d*(\.\d{1,2})?$/`. À confirmer avec les exigences métier.

---

## Résumé des actions recommandées

| Priorité | Fichier | Action | Statut |
|----------|---------|--------|--------|
| Faible | `schema.ts:130` | Extraire `faqItems.filter(isValidFaqItem)` en variable locale | ✅ |
| Faible | `schema.ts:10` | Déplacer `isValidFaqItem` après les interfaces | ✅ |
| Faible | `reader.ts:12` | Warn dev si `Astro.site` est undefined | ✅ |
| Faible | `CrossLinksSection.astro:9` | Documenter le comportement de `excludeHref` omis | ✅ |
| Faible | `Footer.astro:26` | Regex téléphone ne supprimait pas les tirets | ✅ |
| Info | `keystatic.config.ts:19` | Confirmer si prix `0` est intentionnel | En attente |
