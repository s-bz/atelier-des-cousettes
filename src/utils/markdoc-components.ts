import { block, wrapper } from '@keystatic/core/content-components';
import { fields } from '@keystatic/core';
import Markdoc, { type Config, type Node } from '@markdoc/markdoc';

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
 * Transform and render a Markdoc node to an HTML string,
 * with support for custom components (CTA button, callout, YouTube).
 */
export function renderMarkdoc(node: Node | null | undefined): string {
  if (!node) return '';
  const transformed = Markdoc.transform(node, markdocConfig);
  return Markdoc.renderers.html(transformed);
}
