import { describe, expect, it } from 'vitest';
import type {
  ImageRecord,
  PublicLandingPayload,
  TripWithRelations,
} from '../src/shared/types.ts';
import { renderShell, safeRenderShell } from './html-shell.ts';

const template = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>everyDay | رحلات داخل مصر</title>
    <meta name="description" content="old" />
    <meta property="og:title" content="old" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body><div id="root"></div></body>
</html>`;

function image(id: string, url: string, widths: number[] = [480, 768, 1200]): ImageRecord {
  return {
    id,
    provider: 'STATIC',
    publicId: `seed/${id}`,
    url: `${url}-w1200.webp`,
    width: 1376,
    height: 768,
    bytes: 1000,
    format: 'webp',
    avgColor: '#123456',
    createdAt: '2026-01-01T00:00:00.000Z',
    variants: { format: 'webp', widths, basePath: url },
  };
}

function landing(overrides: Partial<PublicLandingPayload> = {}): PublicLandingPayload {
  const heroImage = image('hero-1', 'assets/img/hero_one');
  return {
    settings: {
      id: 'default',
      companyName: { ar: 'إفري داي', en: 'everyDay', enManual: true },
      logoImageId: null,
      faviconImageId: null,
      phone: '',
      whatsapp: '',
      email: '',
      address: { ar: '', en: '', enManual: true },
      mapUrl: '',
      tiktokUrl: '',
      facebookUrl: '',
      instagramUrl: '',
      whatsappMessage: { ar: '', en: '', enManual: true },
      seoTitle: { ar: 'عنوان الموقع', en: 'Site title', enManual: true },
      seoDescription: { ar: 'وصف الموقع', en: 'Site description', enManual: true },
      ogImageId: null,
      aboutTitle: { ar: '', en: '', enManual: true },
      aboutBody: { ar: '', en: '', enManual: true },
      heroBadge: { ar: '', en: '', enManual: true },
      heroTitle: { ar: '', en: '', enManual: true },
      heroSubtitle: { ar: '', en: '', enManual: true },
      heroDescription: { ar: '', en: '', enManual: true },
      heroFeatures: [],
      heroIntervalSeconds: 5,
      showTripsSection: true,
      showWhyUsSection: true,
      showGallerySection: true,
      showContactSection: true,
      whyUsItems: [],
      tripsIntro: { ar: '', en: '', enManual: true },
      galleryTitle: { ar: '', en: '', enManual: true },
      contactIntro: { ar: '', en: '', enManual: true },
      footerTagline: { ar: '', en: '', enManual: true },
      logoImage: null,
      faviconImage: null,
      ogImage: null,
    },
    heroImages: [
      { id: 'h1', imageId: 'hero-1', sortOrder: 0, image: heroImage },
      { id: 'h2', imageId: 'hero-2', sortOrder: 1, image: image('hero-2', 'assets/img/hero_two') },
    ],
    destinations: [],
    trips: [],
    gallery: { items: [], total: 0 },
    ...overrides,
  };
}

function trip(): TripWithRelations {
  return {
    id: 'trip-1',
    slug: 'siwa-oasis',
    title: { ar: 'واحة سيوة', en: 'Siwa Oasis', enManual: true },
    destinationId: 'dest-1',
    tagline: { ar: 'مغامرة في الصحراء', en: 'A desert adventure', enManual: true },
    badge: null,
    features: [],
    description: { ar: 'وصف طويل', en: 'Long description', enManual: true },
    durationDays: 3,
    priceAmount: 5000,
    pricePrefix: 'STARTING_FROM',
    priceUnit: 'PER_PERSON',
    status: 'PUBLISHED',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    destination: null,
    images: [
      { id: 'ti-1', tripId: 'trip-1', imageId: 'trip-cover', sortOrder: 0, image: image('trip-cover', 'assets/img/trip_cover') },
    ],
    itinerary: [],
    optionalActivities: [],
  };
}

const base = {
  template,
  locale: 'ar' as const,
  origin: 'https://example.com',
  path: '/ar',
  landing: landing(),
  supabaseOrigin: 'https://demo.supabase.co',
};

describe('HTML shell injection', () => {
  it('sets lang and dir for each locale', () => {
    expect(renderShell(base)).toContain('<html lang="ar" dir="rtl">');
    expect(renderShell({ ...base, locale: 'en', path: '/en' })).toContain(
      '<html lang="en" dir="ltr">'
    );
  });

  it('injects the slim payload and escapes <', () => {
    const unsafe = landing({
      settings: {
        ...landing().settings,
        seoTitle: { ar: 'عنوان </script><script>alert(1)</script>', en: '', enManual: false },
      },
    });
    const html = renderShell({ ...base, landing: unsafe });
    expect(html).toContain('<script id="site-data" type="application/json">');
    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).toContain('\\u003c/script');
  });

  it('preloads the first hero image with its srcset', () => {
    const html = renderShell(base);
    expect(html).toContain('rel="preload" as="image"');
    expect(html).toContain('imagesrcset=');
    expect(html).toContain('hero_one-w480.webp 480w');
    expect(html).toContain('rel="preconnect" href="https://demo.supabase.co"');
  });

  it('uses the first hero image, not the second', () => {
    const html = renderShell(base);
    expect(html).toContain('hero_one');
    expect(html).not.toContain('hero_two-w480');
  });

  it('gives trip routes the trip title, description and cover image', () => {
    const html = renderShell({ ...base, path: '/ar/trips/siwa-oasis', trip: trip() });
    expect(html).toContain('<title>واحة سيوة | عنوان الموقع</title>');
    expect(html).toContain('مغامرة في الصحراء');
    expect(html).toContain('property="og:image" content="https://example.com/assets/img/trip_cover-w1200.webp"');
    expect(html).toContain('hreflang="en" href="https://example.com/en/trips/siwa-oasis"');
    expect(html).toContain('"slug":"siwa-oasis"');
  });

  it('keeps the canonical URL per locale and route', () => {
    const html = renderShell({ ...base, locale: 'en', path: '/en/trips/siwa-oasis' });
    expect(html).toContain('<link rel="canonical" href="https://example.com/en/trips/siwa-oasis">');
    expect(html).toContain('hreflang="ar" href="https://example.com/ar/trips/siwa-oasis"');
  });

  it('falls back to the plain template when the template is missing', () => {
    const result = safeRenderShell({ ...base, template: null });
    expect(result.injected).toBe(false);
    expect(result.html).toBe('');
  });

  it('falls back to the plain template when injection throws', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const broken = { ...landing(), settings: circular as unknown as PublicLandingPayload['settings'] };
    const result = safeRenderShell({ ...base, landing: broken });
    expect(result.injected).toBe(false);
    expect(result.html).toBe(template);
  });
});
