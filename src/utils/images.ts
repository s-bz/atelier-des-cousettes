type ImageGlob = Record<string, () => Promise<{ default: ImageMetadata }>>;

export function resolveImagePath(
  rawPath: string | null | undefined,
  glob: ImageGlob,
): string | undefined {
  if (!rawPath) return undefined;
  if (glob[rawPath]) return rawPath;
  return Object.keys(glob).find((p) => p.endsWith(`/${rawPath}`));
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
