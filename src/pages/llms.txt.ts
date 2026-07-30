import type { APIRoute } from 'astro';
import { construireLlms } from '../utils/faits-publics';
import { rassemblerFaitsPublics } from '../utils/faits-publics-source';

/**
 * Rendu à la demande, et non déposé dans `public/`.
 *
 * C'est tout l'objet du changement : un fichier statique se recopie à la main,
 * et celui-ci a passé une saison entière à annoncer aux modèles de langage des
 * prix périmés. Rendu, il ne peut plus mentir sans que la page publique mente
 * aussi.
 */
export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const faits = await rassemblerFaitsPublics(site);
  return new Response(construireLlms(faits), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Une heure de cache : les tarifs bougent une fois l'an, et un robot qui
      // parcourt le site n'a pas à rouvrir la base à chaque page.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
