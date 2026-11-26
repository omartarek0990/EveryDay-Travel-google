import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ImageRecord,
  Locale,
  PublicLandingPayload,
  TripWithRelations,
} from '../src/shared/types.ts';
import { imageProps } from '../src/lib/image-url.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_CANDIDATES = [
  path.join(process.cwd(), 'dist', 'index.html'),
  path.join(HERE, 'dist', 'index.html'),
  path.join(HERE, '..', 'dist', 'index.html'),
  '/var/task/dist/index.html',
];

let cachedTemplate: string | null = null;

/** Reads the built SPA shell once; returns null when it is not on disk (dev server, failed build). */
export function loadHtmlTemplate(): string | null {
  if (cachedTemplate) return cachedTemplate;
  for (const candidate of TEMPLATE_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        cachedTemplate = fs.readFileSync(candidate, 'utf8');
        return cachedTemplate;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** Test seam: forget the cached template. */
export function resetHtmlTemplateCache(): void {
  cachedTemplate = null;
}

export function escapeJsonForScript(value: string): string {
  return value
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pickHeroImage(landing: PublicLandingPayload): ImageRecord | null {
  return landing.heroImages[0]?.image ?? landing.settings.ogImage ?? null;
}

function absoluteUrl(origin: string, url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Preloads the first hero image using the responsive variants from part 1. */
export function heroPreloadLinks(image: ImageRecord | null): string {
  if (!image) return '';
  const props = imageProps(image, { sizes: '100vw', maxWidth: 2000 });
  if (!props.src) return '';
  if (props.srcSet) {
    const sizes = props.sizes ? ` imagesizes="${escapeHtml(props.sizes)}"` : '';
    return `<link rel="preload" as="image" imagesrcset="${escapeHtml(
      props.srcSet
    )}"${sizes} fetchpriority="high">`;
  }
  return `<link rel="preload" as="image" href="${escapeHtml(props.src)}" fetchpriority="high">`;
}

export function supabasePreconnect(origin: string | null): string {
  if (!origin) return '';
  return `<link rel="preconnect" href="${escapeHtml(origin)}" crossorigin>`;
}

export interface ShellMetaOptions {
  locale: Locale;
  origin: string;
  path: string;
  title: string;
  description: string;
  imageUrl: string | null;
}

/** Per-route title/description/canonical/hreflang/OG/Twitter tags. */
export function buildHeadTags(options: ShellMetaOptions): string {
  const { locale, origin, path: routePath, title, description, imageUrl } = options;
  const subPath = routePath.replace(/^\/(ar|en)/, '');
  const canonical = `${origin}/${locale}${subPath}`;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<link rel="alternate" hreflang="ar" href="${escapeHtml(`${origin}/ar${subPath}`)}">`,
    `<link rel="alternate" hreflang="en" href="${escapeHtml(`${origin}/en${subPath}`)}">`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${origin}/ar${subPath}`)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="everyDay Travel Agency">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:locale" content="${locale === 'ar' ? 'ar_EG' : 'en_US'}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  ];
  if (imageUrl) {
    const absolute = absoluteUrl(origin, imageUrl);
    tags.push(`<meta property="og:image" content="${escapeHtml(absolute)}">`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(absolute)}">`);
  }
  return tags.join('\n    ');
}

export interface RenderShellOptions {
  template: string;
  locale: Locale;
  origin: string;
  path: string;
  landing: PublicLandingPayload;
  trip?: TripWithRelations | null;
  supabaseOrigin?: string | null;
}

function localized(
  value: { ar: string; en: string; enManual: boolean } | null | undefined,
  locale: Locale,
  fallbackAr = true
): string {
  if (!value) return '';
  const preferred = locale === 'en' ? value.en : value.ar;
  if (preferred) return preferred;
  return fallbackAr ? value.ar : '';
}

/**
 * Injects the per-route head, the slim payload and the hero preload into the
 * built shell. Pure (no I/O) so it can be unit tested; the route wraps it in a
 * try/catch and falls back to the untouched template.
 */
export function renderShell(options: RenderShellOptions): string {
  const { template, locale, origin, path: routePath, landing, trip } = options;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const settings = landing.settings;
  const title = trip
    ? `${localized(trip.title, locale)} | ${localized(settings.seoTitle, locale)}`
    : localized(settings.seoTitle, locale);
  const description = trip
    ? localized(trip.tagline, locale) || localized(trip.description, locale)
    : localized(settings.seoDescription, locale);
  const coverImage = trip?.images[0]?.image ?? pickHeroImage(landing);

  const siteData = escapeJsonForScript(JSON.stringify(trip ? { ...landing, trip } : landing));

  let head = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '');

  const injectedHead = [
    buildHeadTags({ locale, origin, path: routePath, title, description, imageUrl: coverImage?.url ?? null }),
    heroPreloadLinks(pickHeroImage(landing)),
    supabasePreconnect(options.supabaseOrigin ?? null),
    `<script id="site-data" type="application/json">${siteData}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  head = head.replace('</head>', `    ${injectedHead}\n  </head>`);
  head = head.replace(/<html[^>]*>/i, `<html lang="${locale}" dir="${dir}">`);
  return head;
}

export interface SafeRenderResult {
  html: string;
  injected: boolean;
}

/** Never throws: on any failure the untouched template is served. */
export function safeRenderShell(
  options: Omit<RenderShellOptions, 'template'> & { template: string | null }
): SafeRenderResult {
  if (!options.template) {
    return { html: '', injected: false };
  }
  try {
    return { html: renderShell({ ...options, template: options.template }), injected: true };
  } catch (error) {
    console.error('[html-shell] injection failed, serving the plain template:', error);
    return { html: options.template, injected: false };
  }
}
