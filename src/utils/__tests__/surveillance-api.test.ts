import { describe, expect, it, vi } from 'vitest';
import {
  ErreurServeurApi,
  classerReponse,
  cleDeRoute,
  empreinte,
  installerSurveillanceApi,
  type PanneApi,
} from '../surveillance-api';

const PAGE = 'https://atelier-des-cousettes.fr/seances-sans-engagement/reserver/';

function rep(status: number, headers: Record<string, string> = {}): Response {
  return new Response('corps', { status, headers });
}

describe('cleDeRoute', () => {
  it('garde les noms de route statiques, extension comprise', () => {
    expect(cleDeRoute('/api/devis.json')).toBe('/api/devis.json');
    expect(cleDeRoute('/api/devis-unite.json')).toBe('/api/devis-unite.json');
    expect(cleDeRoute('/api/helloasso/notifications/')).toBe('/api/helloasso/notifications/');
  });

  it('replie le jeton du calendrier : il ne doit jamais partir chez PostHog', () => {
    expect(cleDeRoute('/api/calendrier/3f9c2a7e-41b0-4d6e-9a51-0c2f8e7d1b44.ics')).toBe('/api/calendrier/:param');
    expect(cleDeRoute('/api/calendrier/a1B2c3.ics')).toBe('/api/calendrier/:param');
  });
});

describe('classerReponse', () => {
  it('signale une 5xx de notre /api/ avec les diagnostics Vercel', () => {
    const panne = classerReponse(
      '/api/devis.json?formule=carte-10',
      undefined,
      rep(500, { 'x-vercel-error': 'FUNCTION_INVOCATION_FAILED', 'x-vercel-id': 'cdg1::abc' }),
      PAGE,
    );
    expect(panne).toEqual({
      method: 'GET',
      route: '/api/devis.json',
      status: 500,
      vercelError: 'FUNCTION_INVOCATION_FAILED',
      vercelId: 'cdg1::abc',
    });
  });

  it("n'emporte ni la chaîne de requête ni le chemin réel", () => {
    const panne = classerReponse('/api/calendrier/secret123.ics?x=1', undefined, rep(502), PAGE);
    expect(JSON.stringify(panne)).not.toContain('secret123');
    expect(JSON.stringify(panne)).not.toContain('x=1');
  });

  it('ignore les 2xx à 4xx : une formule inconnue est une réponse, pas une panne', () => {
    expect(classerReponse('/api/devis.json', undefined, rep(200), PAGE)).toBeNull();
    expect(classerReponse('/api/devis.json', undefined, rep(400), PAGE)).toBeNull();
    expect(classerReponse('/api/devis.json', undefined, rep(404), PAGE)).toBeNull();
  });

  it("ignore les autres origines et ce qui n'est pas /api/", () => {
    expect(classerReponse('https://api.helloasso.com/v5/x', undefined, rep(500), PAGE)).toBeNull();
    expect(classerReponse('/tarifs.md', undefined, rep(503), PAGE)).toBeNull();
  });

  it("lit la méthode dans init ou dans un Request", () => {
    expect(classerReponse('/api/devis.json', { method: 'post' }, rep(500), PAGE)?.method).toBe('POST');
    const requete = new Request('https://atelier-des-cousettes.fr/api/devis.json', { method: 'POST' });
    expect(classerReponse(requete, undefined, rep(500), PAGE)?.method).toBe('POST');
  });
});

describe('ErreurServeurApi', () => {
  it('nomme la route, le statut et l’erreur de la plateforme', () => {
    const panne: PanneApi = {
      method: 'GET',
      route: '/api/devis.json',
      status: 500,
      vercelError: 'FUNCTION_INVOCATION_FAILED',
      vercelId: null,
    };
    const erreur = new ErreurServeurApi(panne);
    expect(erreur.name).toBe('ErreurServeurApi');
    expect(erreur.message).toBe('GET /api/devis.json → 500 (FUNCTION_INVOCATION_FAILED)');
    expect(empreinte(panne)).toBe('erreur-serveur-api GET /api/devis.json 500');
  });
});

describe('installerSurveillanceApi', () => {
  function fausseFenetre(repondre: () => Response) {
    const contextes: unknown[] = [];
    const win = {
      location: { href: PAGE },
      fetch: vi.fn(function (this: unknown) {
        contextes.push(this);
        return Promise.resolve(repondre());
      }) as unknown as typeof fetch,
    };
    return { win, contextes };
  }

  it('rend la réponse intacte et signale une 5xx une fois par route', async () => {
    const { win, contextes } = fausseFenetre(() => rep(500));
    const signaler = vi.fn();
    installerSurveillanceApi(win, signaler);

    const premiere = await win.fetch('/api/devis.json?formule=a');
    await win.fetch('/api/devis.json?formule=b');
    await win.fetch('/api/devis-unite.json');

    expect(premiere.status).toBe(500);
    expect(await premiere.text()).toBe('corps'); // corps non consommé par la surveillance
    expect(signaler.mock.calls.map(([p]) => p.route)).toEqual(['/api/devis.json', '/api/devis-unite.json']);
    expect(contextes.every((c) => c === win)).toBe(true); // le fetch natif exige this = window
  });

  it('ne signale pas une réponse saine', async () => {
    const { win } = fausseFenetre(() => rep(200));
    const signaler = vi.fn();
    installerSurveillanceApi(win, signaler);
    await win.fetch('/api/devis.json');
    expect(signaler).not.toHaveBeenCalled();
  });

  it('laisse passer un fetch rejeté sans le signaler', async () => {
    const win = {
      location: { href: PAGE },
      fetch: (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch,
    };
    const signaler = vi.fn();
    installerSurveillanceApi(win, signaler);
    await expect(win.fetch('/api/devis.json')).rejects.toThrow('Failed to fetch');
    expect(signaler).not.toHaveBeenCalled();
  });

  it('un signalement qui plante ne casse jamais la requête', async () => {
    const { win } = fausseFenetre(() => rep(503));
    installerSurveillanceApi(win, () => {
      throw new Error('posthog indisponible');
    });
    await expect(win.fetch('/api/devis.json')).resolves.toHaveProperty('status', 503);
  });

  it("ne s'installe qu'une fois", async () => {
    const { win } = fausseFenetre(() => rep(500));
    const signaler = vi.fn();
    installerSurveillanceApi(win, signaler);
    installerSurveillanceApi(win, signaler);
    await win.fetch('/api/devis.json');
    expect(signaler).toHaveBeenCalledTimes(1);
  });
});
