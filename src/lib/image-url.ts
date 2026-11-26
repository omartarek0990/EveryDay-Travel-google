import type { ImageRecord, ImageVariants } from '../shared/types';

/** Widths generated for every new upload. Widths larger than the source are skipped. */
export const IMAGE_VARIANT_WIDTHS = [480, 768, 1200, 1600, 2000] as const;

export const FALLBACK_IMAGE_WIDTH = 1600;
export const FALLBACK_IMAGE_HEIGHT = 1200;

export interface ImageProps {
  src: string | null;
  srcSet?: string;
  sizes?: string;
  width: number;
  height: number;
  /** Average color of the image, used as a background while it loads. */
  backgroundColor?: string;
}

export interface ImagePropsOptions {
  /** `sizes` attribute, e.g. `(min-width: 1024px) 33vw, 100vw`. */
  sizes?: string;
  /** Largest CSS width this image can be displayed at. Variants above it are not offered. */
  maxWidth?: number;
}

function normalizeWidths(widths: readonly number[], maxWidth?: number): number[] {
  const unique = Array.from(new Set(widths.filter((w) => Number.isFinite(w) && w > 0)));
  unique.sort((a, b) => a - b);
  return typeof maxWidth === 'number' && maxWidth > 0
    ? unique.filter((w) => w <= maxWidth)
    : unique;
}

/**
 * Widths offered to the browser for one image: never larger than the source and
 * never larger than the display slot.
 */
export function selectVariantWidths(
  variants: ImageVariants | null | undefined,
  sourceWidth?: number,
  maxWidth?: number
): number[] {
  if (!variants || !Array.isArray(variants.widths)) return [];
  const limit = Math.min(
    typeof maxWidth === 'number' && maxWidth > 0 ? maxWidth : Number.POSITIVE_INFINITY,
    typeof sourceWidth === 'number' && sourceWidth > 0 ? sourceWidth : Number.POSITIVE_INFINITY
  );
  return normalizeWidths(variants.widths, limit);
}

function stripExtension(path: string): string {
  return path.replace(/\.[a-z0-9]{2,5}$/i, '');
}

/** Public storage prefix of a Supabase object URL, e.g. `https://x.supabase.co/storage/v1/object/public/site-images/`. */
export function supabasePublicPrefix(url: string): string | null {
  const match = /^(.*\/storage\/v1\/object\/public\/[^/]+\/)/.exec(url);
  return match ? match[1] : null;
}

/**
 * URL of one variant of an image. Returns null when the image has no variants or
 * when the current provider cannot serve them (Cloudinary), so callers can always
 * fall back to the single original `url`.
 */
export function variantUrl(image: ImageRecord, width: number): string | null {
  const variants = image.variants;
  if (!variants || !variants.basePath || !variants.format) return null;
  if (!selectVariantWidths(variants, image.width).includes(width)) return null;

  const base = stripExtension(variants.basePath);
  const fileName = `${base}-w${width}.${variants.format}`;

  if (image.provider === 'SUPABASE') {
    const prefix = supabasePublicPrefix(image.url);
    return prefix ? `${prefix}${fileName}` : null;
  }
  if (image.provider === 'STATIC') {
    return `/${fileName}`;
  }
  return null;
}

/** Builds the `srcset` attribute, or undefined when there is nothing better than `src`. */
export function buildSrcSet(image: ImageRecord, widths: readonly number[]): string | undefined {
  const entries = widths
    .map((width) => {
      const url = variantUrl(image, width);
      return url ? `${url} ${width}w` : null;
    })
    .filter((entry): entry is string => Boolean(entry));

  return entries.length >= 2 ? entries.join(', ') : undefined;
}

/**
 * Everything an `<img>` needs. Backward compatible: an image without variants
 * (or a provider without variant support) yields the plain original URL.
 */
export function imageProps(
  image: ImageRecord | null | undefined,
  options: ImagePropsOptions = {}
): ImageProps {
  const width = Math.max(1, Math.round(image?.width || FALLBACK_IMAGE_WIDTH));
  const height = Math.max(1, Math.round(image?.height || FALLBACK_IMAGE_HEIGHT));

  if (!image?.url) {
    return { src: null, width, height };
  }

  const widths = selectVariantWidths(image.variants, image.width, options.maxWidth);
  const usable = widths.map((w) => ({ width: w, url: variantUrl(image, w) })).filter((v) => v.url);

  const base = {
    width,
    height,
    backgroundColor: image.avgColor ?? undefined,
  };

  if (usable.length === 0) {
    return { ...base, src: image.url };
  }

  const largest = usable[usable.length - 1];
  const srcSet = buildSrcSet(image, usable.map((v) => v.width));
  return {
    ...base,
    src: largest.url as string,
    srcSet,
    sizes: srcSet ? options.sizes : undefined,
  };
}
