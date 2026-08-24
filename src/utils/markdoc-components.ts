import { block, wrapper } from '@keystatic/core/content-components';
import { fields } from '@keystatic/core';
import Markdoc, { type Config, type Node, type NodeType } from '@markdoc/markdoc';

const Tag = Markdoc.Tag;

// ---------------------------------------------------------------------------
// 1. Keystatic content-components (editor toolbar blocks)
// ---------------------------------------------------------------------------

export const ctaButton = block({
  label: 'Bouton CTA',
  description: "Bouton d'appel à l'action avec lien",
  schema: {
    label: fields.text({ label: 'Libellé du bouton' }),
    href: fields.text({ label: 'URL (ex: /stages-thematiques)' }),
    variant: fields.select({
      label: 'Style',
      options: [
        { label: 'Principal (corail)', value: 'primary' },
        { label: 'Contour', value: 'outline' },
      ],
      defaultValue: 'primary',
    }),
  },
});

export const callout = wrapper({
  label: 'Encadré',
  description: 'Encadré informatif, astuce ou avertissement',
  schema: {
    type: fields.select({
      label: 'Type',
      options: [
        { label: 'Astuce', value: 'tip' },
        { label: 'Info', value: 'info' },
        { label: 'Matériel nécessaire', value: 'material' },
      ],
      defaultValue: 'tip',
    }),
    title: fields.text({ label: 'Titre (optionnel)' }),
  },
});

export const youtubeEmbed = block({
  label: 'Vidéo YouTube',
  description: 'Intégrer une vidéo YouTube',
  schema: {
    videoId: fields.text({ label: 'ID de la vidéo YouTube' }),
    title: fields.text({ label: 'Titre de la vidéo (optionnel)' }),
  },
});

/** All custom components — pass to `fields.markdoc({ components })`. */
export const markdocComponents = {
  ctaButton,
  callout,
  youtubeEmbed,
};

// ---------------------------------------------------------------------------
// 2. Markdoc transform config (tag schemas for rendering)
// ---------------------------------------------------------------------------

const CALLOUT_ICONS: Record<string, string> = {
  tip: '💡',
  info: 'ℹ️',
  material: '🧵',
};

const CALLOUT_DEFAULTS: Record<string, string> = {
  tip: 'Astuce couture',
  info: 'Bon à savoir',
  material: 'Matériel nécessaire',
};

const markdocConfig: Config = {
  nodes: {
    /*
     * UN TABLEAU DÉFILE DANS SON PROPRE CADRE, JAMAIS LA PAGE.
     *
     * Markdoc rendait `<table>` nu. Tant qu'un seul article en portait un, de
     * trois colonnes, cela ne se voyait pas ; à cinq colonnes sur un téléphone,
     * le tableau pousse la largeur du document et c'est la PAGE ENTIÈRE qui se
     * met à défiler de côté — titres et paragraphes compris.
     *
     * L'enveloppe règle cela sans toucher au tableau lui-même : elle porte le
     * défilement horizontal, le tableau garde sa mise en page de tableau. Les
     * bordures et l'alternance de fond, elles, sont dans `.prose table`.
     */
    table: {
      ...Markdoc.nodes.table,
      transform(node, config) {
        return new Tag('div', { class: 'markdoc-table' }, [
          new Tag('table', {}, node.transformChildren(config)),
        ]);
      },
    },
  },
  tags: {
    ctaButton: {
      selfClosing: true,
      attributes: {
        label: { type: String, required: true },
        href: { type: String, required: true },
        variant: { type: String, default: 'primary' },
      },
      transform(node, config) {
        const attrs = node.transformAttributes(config);
        const href = (attrs.href as string | undefined) || '#';
        const variant = attrs.variant || 'primary';
        const classes =
          variant === 'outline'
            ? 'markdoc-cta markdoc-cta--outline'
            : 'markdoc-cta markdoc-cta--primary';
        const isExternal = href.startsWith('http');
        return new Tag('div', { class: 'markdoc-cta-wrapper' }, [
          new Tag(
            'a',
            {
              href,
              class: classes,
              ...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
            },
            [attrs.label],
          ),
        ]);
      },
    },
    callout: {
      attributes: {
        type: { type: String, default: 'tip' },
        title: { type: String },
      },
      transform(node, config) {
        const attrs = node.transformAttributes(config);
        const type = attrs.type || 'tip';
        const icon = CALLOUT_ICONS[type] || CALLOUT_ICONS.tip;
        const title = attrs.title || CALLOUT_DEFAULTS[type] || '';
        const children = node.transformChildren(config);
        return new Tag('aside', { class: `markdoc-callout markdoc-callout--${type}` }, [
          new Tag('p', { class: 'markdoc-callout__title' }, [`${icon} ${title}`]),
          new Tag('div', { class: 'markdoc-callout__content' }, children),
        ]);
      },
    },
    youtubeEmbed: {
      selfClosing: true,
      attributes: {
        videoId: { type: String, required: true },
        title: { type: String, default: 'Vidéo' },
      },
      transform(node, config) {
        const attrs = node.transformAttributes(config);
        const videoId = attrs.videoId as string;
        const title = attrs.title as string;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        return new Tag('div', { class: 'markdoc-youtube', 'data-video-id': videoId }, [
          new Tag('img', {
            src: thumbnailUrl,
            alt: title,
            class: 'markdoc-youtube__thumb',
            loading: 'lazy',
            width: '480',
            height: '360',
          }),
          new Tag(
            'button',
            {
              type: 'button',
              class: 'markdoc-youtube__play',
              'aria-label': `Lire la vidéo : ${title}`,
            },
            [
              new Tag(
                'svg',
                {
                  class: 'markdoc-youtube__icon',
                  viewBox: '0 0 68 48',
                },
                [
                  new Tag('path', {
                    d: 'M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74 .06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z',
                    fill: 'red',
                  }),
                  new Tag('path', { d: 'M45 24L27 14v20', fill: 'white' }),
                ],
              ),
            ],
          ),
        ]);
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 3. Render helper — replaces raw Markdoc.transform + Markdoc.renderers.html
// ---------------------------------------------------------------------------

/**
 * A Markdoc AST node, whichever copy of @markdoc/markdoc built it.
 *
 * Two copies coexist in the tree and both are load-bearing: Keystatic pins
 * `@markdoc/markdoc@^0.4.0` (still true as of @keystatic/core 0.6.8), while this
 * project and @astrojs/markdoc depend on 0.5.x. So the nodes the Keystatic reader
 * hands us are 0.4.0 instances, and `Markdoc.transform` below is 0.5.x.
 *
 * That handoff works — the AST is plain data and `transform` dispatches to the
 * node's own method — but the two `Node` classes are not assignable to each
 * other: 0.5 narrowed `Schema['children']` from `string[]` to `NodeType[]`, and
 * `Node` surfaces `Schema` through `findSchema()`/`resolve()`. Typing the
 * parameter as the local `Node` therefore fails on every call site.
 *
 * So the boundary asks only for the fields both copies agree on, and the cast
 * back to `Node` is confined to this one function.
 */
export type MarkdocNode = {
  readonly $$mdtype: 'Node';
  type: NodeType;
  attributes: Record<string, any>;
};

/**
 * Transform and render a Markdoc node to an HTML string,
 * with support for custom components (CTA button, callout, YouTube).
 */
export function renderMarkdoc(node: MarkdocNode | null | undefined): string {
  if (!node) return '';
  const transformed = Markdoc.transform(node as unknown as Node, markdocConfig);
  return Markdoc.renderers.html(transformed);
}
