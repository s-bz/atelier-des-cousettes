type ImageGlob = Record<string, () => Promise<{ default: ImageMetadata }>>;

export function resolveImagePath(
  rawPath: string | null | undefined,
  glob: ImageGlob,
): string | undefined {
  if (!rawPath) return undefined;
  if (glob[rawPath]) return rawPath;
  const byPath = Object.keys(glob).find((p) => p.endsWith(`/${rawPath}`));
  if (byPath) return byPath;
  // Keystatic collections store `publicPath + <entry slug> + / + filename`, but write
  // the asset flat into `directory`. The slug segment is therefore not a real folder,
  // so fall back to matching on the basename alone.
  const basename = rawPath.split('/').pop();
  if (!basename || basename === rawPath) return undefined;
  return Object.keys(glob).find((p) => p.endsWith(`/${basename}`));
}

export async function resolveImage(
  rawPath: string | null | undefined,
  glob: ImageGlob,
): Promise<ImageMetadata | null> {
  if (!rawPath) return null;
  const resolved = resolveImagePath(rawPath, glob);
  if (!resolved) {
    if (import.meta.env.DEV) {
      console.warn(`[resolveImage] Image not found: "${rawPath}"`);
    }
    return null;
  }
  const mod = await glob[resolved]?.();
  return mod?.default ?? null;
}

export async function resolveImageUrl(
  rawPath: string | null | undefined,
  glob: ImageGlob,
  site: URL | undefined,
): Promise<string | undefined> {
  const img = await resolveImage(rawPath, glob);
  if (!img || !site) return undefined;
  return new URL(img.src, site).toString();
}
