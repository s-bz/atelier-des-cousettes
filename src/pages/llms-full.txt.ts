import type { APIRoute } from 'astro';
import { construireLlmsFull } from '../utils/faits-publics';
import { rassemblerFaitsPublics } from '../utils/faits-publics-source';

/** Voir `llms.txt.ts` : rendu plutôt que recopié, pour la même raison. */
export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const faits = await rassemblerFaitsPublics(site);
  return new Response(construireLlmsFull(faits), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
