import type { APIRoute } from 'astro';
import { construireDates } from '../utils/faits-publics';
import { rassemblerFaitsPublics } from '../utils/faits-publics-source';

/**
 * Le calendrier, en un seul fichier lisible par une machine.
 *
 * POURQUOI UN FICHIER DE PLUS. Les dates existent en base et s'affichent sur
 * trois pages, mais aucune ne les rassemble : un moteur de réponse à qui l'on
 * demande « quand a lieu le prochain stage de couture près de Castres » devait
 * les recoller depuis du HTML de mise en page, ou renoncer. Il renonçait.
 *
 * Une heure de cache, comme les autres fichiers pour machines : une date ne
 * bouge pas dans l'heure. Les places restantes, elles, bougent — c'est pourquoi
 * `construireDates` ne les publie pas et renvoie aux pages, qui les calculent à
 * chaque visite.
 */
export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const faits = await rassemblerFaitsPublics(site);
  return new Response(construireDates(faits), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
