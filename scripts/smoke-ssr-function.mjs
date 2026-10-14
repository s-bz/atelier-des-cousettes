#!/usr/bin/env node
/**
 * Contrôle d'après-build : chaque fonction Vercel émise doit pouvoir se CHARGER.
 *
 * POURQUOI. Le 13 octobre 2026, @astrojs/vercel 11.0.13 a fait importer
 * `rolldown` (un outil de build) par le point d'entrée de la fonction, sans en
 * embarquer la liaison native. `astro build` réussissait, le déploiement aussi,
 * et en production TOUTES les routes à la demande — réservation, espace membre,
 * notifications HelloAsso, devis, llms.txt — répondaient 500
 * FUNCTION_INVOCATION_FAILED pendant une trentaine d'heures. Les pages
 * statiques, elles, s'affichaient : rien ne se voyait de l'extérieur.
 *
 * DEUX PASSES.
 * 1. Importer le point d'entrée de chaque `.func`, comme le fait Vercel.
 * 2. Importer chaque module du serveur. Astro charge le code d'une route
 *    paresseusement, à sa première requête : une dépendance que seule une route
 *    importe passerait la première passe et casserait en production.
 *
 * ON IMPORTE, ON N'APPELLE PAS. Les pages à la demande interrogent Supabase et
 * HelloAsso dès leur rendu ; un build n'a pas à le faire. Importer un module
 * résout toutes ses dépendances sans exécuter une seule ligne de rendu — c'est
 * exactement le défaut qu'on cherche.
 *
 * La résolution part de l'intérieur du `.func` : seules les dépendances que le
 * traçage de Vercel y a copiées sont atteignables, comme en production.
 *
 * Un échec ici fait échouer le build : sur Vercel, le déploiement précédent
 * reste en ligne ; en CI, la PR passe au rouge.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Tous les `.mjs` sous `dir`, hors node_modules, triés pour un ordre stable. */
export function modulesSous(dir) {
  const trouves = [];
  const parcourir = (d) => {
    for (const nom of readdirSync(d)) {
      if (nom === 'node_modules') continue;
      const chemin = join(d, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (nom.endsWith('.mjs')) trouves.push(chemin);
    }
  };
  parcourir(dir);
  return trouves.sort();
}

/** Exécute `fn` en taisant la console : certains modules journalisent au chargement. */
async function enSilence(fn) {
  const sauve = { warn: console.warn, log: console.log, info: console.info };
  console.warn = console.log = console.info = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, sauve);
  }
}

async function main() {
  const dossierFonctions = resolve('.vercel/output/functions');
  if (!existsSync(dossierFonctions)) {
    console.log('[smoke-ssr-function] pas de .vercel/output/functions — rien à contrôler');
    return 0;
  }

  let echec = false;

  for (const nom of readdirSync(dossierFonctions)) {
    if (!nom.endsWith('.func')) continue;
    const dossier = join(dossierFonctions, nom);
    const config = JSON.parse(readFileSync(join(dossier, '.vc-config.json'), 'utf8'));
    if (!config.handler) continue;

    const entree = join(dossier, config.handler);
    try {
      await enSilence(() => import(pathToFileURL(entree).href));
      console.log(`[smoke-ssr-function] ✓ ${nom} se charge`);
    } catch (erreur) {
      echec = true;
      console.error(`[smoke-ssr-function] ✗ ${nom} plante au chargement (${config.handler}) :`);
      console.error(erreur);
      continue;
    }

    const modules = modulesSous(dirname(entree));
    const casses = [];
    for (const module of modules) {
      try {
        await enSilence(() => import(pathToFileURL(module).href));
      } catch (erreur) {
        casses.push(`${relative(dossier, module)} → ${erreur?.message ?? erreur}`);
      }
    }
    if (casses.length) {
      echec = true;
      console.error(`[smoke-ssr-function] ✗ ${nom} : ${casses.length}/${modules.length} modules ne se chargent pas :`);
      for (const ligne of casses) console.error(`  ${ligne}`);
    } else {
      console.log(`[smoke-ssr-function] ✓ ${nom} : les ${modules.length} modules se chargent`);
    }
  }

  if (echec) {
    console.error(
      '[smoke-ssr-function] Une fois déployée, cette fonction répondrait FUNCTION_INVOCATION_FAILED. ' +
        "Le plus souvent, une dépendance (souvent l'adaptateur @astrojs/vercel) a tiré un module non tracé dans le bundle serveur.",
    );
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // Sortie explicite : un module importé peut garder des poignées ouvertes (minuteurs, clients).
  main().then((code) => process.exit(code));
}
