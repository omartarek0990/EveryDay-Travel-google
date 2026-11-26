import type { ImageVariantFormat } from '../shared/types';
import { IMAGE_VARIANT_WIDTHS } from './image-url';

export const VARIANT_QUALITY = 0.78;
export const VARIANT_JPEG_QUALITY = 0.8;

/**
 * Widths we will actually generate for a source image: never upscale, sorted
 * ascending. Pure so it can be unit tested and reused by scripts/optimize-images.
 */
export function planVariantWidths(
  sourceWidth: number,
  targetWidths: readonly number[] = IMAGE_VARIANT_WIDTHS
): number[] {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0) return [];
  return Array.from(
    new Set(
      targetWidths.filter(
        (width) => Number.isFinite(width) && width > 0 && Math.round(width) <= Math.round(sourceWidth)
      )
    )
  ).sort((a, b) => a - b);
}

/** Browsers without canvas WebP encoding fall back to JPEG; the format is recorded with the variants. */
export function pickVariantFormat(supportsWebpEncoding: boolean): ImageVariantFormat {
  return supportsWebpEncoding ? 'webp' : 'jpg';
}

export function variantMimeType(format: ImageVariantFormat): string {
  return format === 'webp' ? 'image/webp' : 'image/jpeg';
}

export function variantFileName(
  basePath: string,
  width: number,
  format: ImageVariantFormat
): string {
  return `${basePath.replace(/\.[a-z0-9]{2,5}$/i, '')}-w${width}.${format}`;
}

/**
 * Detects canvas WebP encoding support. `toDataURL` silently falls back to PNG
 * in browsers without an encoder, which is why we check the prefix.
 */
export function supportsWebpEncoding(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}
