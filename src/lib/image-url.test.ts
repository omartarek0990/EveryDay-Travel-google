import { describe, expect, it } from 'vitest';
import type { ImageRecord } from '../shared/types';
import { buildSrcSet, imageProps, selectVariantWidths, variantUrl } from './image-url';
import { planVariantWidths, pickVariantFormat, variantFileName } from './image-variant';

const supabaseUrl =
  'https://demo.supabase.co/storage/v1/object/public/site-images/everyday/abc-123.jpg';

function makeImage(overrides: Partial<ImageRecord> = {}): ImageRecord {
  return {
    id: 'img-1',
    provider: 'SUPABASE',
    publicId: 'everyday/abc-123.jpg',
    url: supabaseUrl,
    width: 2000,
    height: 1500,
    bytes: 500_000,
    format: 'jpg',
    variants: {
      format: 'webp',
      widths: [480, 768, 1200, 1600, 2000],
      basePath: 'everyday/abc-123',
    },
    avgColor: '#123456',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('selectVariantWidths', () => {
  it('drops widths above the display slot and above the source', () => {
    const image = makeImage({ width: 1200 });
    expect(selectVariantWidths(image.variants, image.width, 768)).toEqual([480, 768]);
    expect(selectVariantWidths(image.variants, image.width)).toEqual([480, 768, 1200]);
  });

  it('returns nothing for old rows without variants', () => {
    expect(selectVariantWidths(null, 2000, 1200)).toEqual([]);
  });
});

describe('variantUrl', () => {
  it('builds a Supabase public URL from the base path', () => {
    const image = makeImage();
    expect(variantUrl(image, 768)).toBe(
      'https://demo.supabase.co/storage/v1/object/public/site-images/everyday/abc-123-w768.webp'
    );
  });

  it('builds a root relative URL for static assets', () => {
    const image = makeImage({
      provider: 'STATIC',
      url: '/assets/img/hero_siwa.webp',
      variants: { format: 'webp', widths: [480, 768], basePath: 'assets/img/hero_siwa' },
    });
    expect(variantUrl(image, 480)).toBe('/assets/img/hero_siwa-w480.webp');
  });

  it('returns null for providers without variant support and for unknown widths', () => {
    const cloudinary = makeImage({ provider: 'CLOUDINARY', url: 'https://res.cloudinary.com/x.jpg' });
    expect(variantUrl(cloudinary, 768)).toBeNull();
    expect(variantUrl(makeImage(), 300)).toBeNull();
    expect(variantUrl(makeImage({ variants: null }), 768)).toBeNull();
  });
});

describe('imageProps', () => {
  it('returns a srcset with the available widths', () => {
    const props = imageProps(makeImage(), { sizes: '100vw', maxWidth: 1200 });
    expect(props.src).toBe(
      'https://demo.supabase.co/storage/v1/object/public/site-images/everyday/abc-123-w1200.webp'
    );
    expect(props.sizes).toBe('100vw');
    expect(props.srcSet?.split(', ').map((entry) => entry.split(' ')[1])).toEqual([
      '480w',
      '768w',
      '1200w',
    ]);
    expect(props.width).toBe(2000);
    expect(props.height).toBe(1500);
    expect(props.backgroundColor).toBe('#123456');
  });

  it('falls back to the original url when a row has no variants', () => {
    const props = imageProps(makeImage({ variants: null, avgColor: null }), { maxWidth: 1200 });
    expect(props.src).toBe(supabaseUrl);
    expect(props.srcSet).toBeUndefined();
    expect(props.sizes).toBeUndefined();
  });

  it('falls back to the original url for images that cannot serve variants', () => {
    const props = imageProps(makeImage({ provider: 'CLOUDINARY' }));
    expect(props.src).toBe(supabaseUrl);
    expect(props.srcSet).toBeUndefined();
  });

  it('never emits a width larger than the source', () => {
    const props = imageProps(makeImage({ width: 800 }), { maxWidth: 2000 });
    expect(props.srcSet?.split(', ').map((entry) => entry.split(' ')[1])).toEqual(['480w', '768w']);
  });

  it('returns null src and placeholder dimensions for a missing image', () => {
    const props = imageProps(null);
    expect(props.src).toBeNull();
    expect(props.width).toBeGreaterThan(0);
    expect(props.height).toBeGreaterThan(0);
  });

  it('builds no srcset for a single usable width', () => {
    const image = makeImage({ width: 480 });
    expect(buildSrcSet(image, [480])).toBeUndefined();
  });
});

describe('variant planning', () => {
  it('skips widths larger than the source and never upscales', () => {
    expect(planVariantWidths(1408)).toEqual([480, 768, 1200]);
    expect(planVariantWidths(480)).toEqual([480]);
    expect(planVariantWidths(300)).toEqual([]);
    expect(planVariantWidths(0)).toEqual([]);
  });

  it('records the format used for encoding', () => {
    expect(pickVariantFormat(true)).toBe('webp');
    expect(pickVariantFormat(false)).toBe('jpg');
    expect(variantFileName('everyday/abc-123.jpg', 768, 'jpg')).toBe('everyday/abc-123-w768.jpg');
  });
});
