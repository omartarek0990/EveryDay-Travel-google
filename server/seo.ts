import type { Request, Response } from 'express';
import { getDb, hydrateTrips } from './db.ts';

function getSiteOrigin(req: Request): string {
  const configured = process.env.APP_URL || process.env.VITE_SITE_URL;
  if (configured && configured.startsWith('http')) {
    return configured.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

function escapeXml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function handleRobotsTxt(req: Request, res: Response): void {
  const origin = getSiteOrigin(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  res.type('text/plain').send(body);
}

export function handleSitemapXml(req: Request, res: Response): void {
  const origin = getSiteOrigin(req);
  const db = getDb();
  const trips = hydrateTrips(db, false);
  const staticPaths = ['', '/trips', '/gallery', '/about', '/contact'];

  const urls: string[] = [];

  for (const p of staticPaths) {
    for (const locale of ['ar', 'en'] as const) {
      const loc = `${origin}/${locale}${p}`;
      urls.push(
        `  <url>\n` +
          `    <loc>${escapeXml(loc)}</loc>\n` +
          `    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(`${origin}/ar${p}`)}" />\n` +
          `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${origin}/en${p}`)}" />\n` +
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}/ar${p}`)}" />\n` +
          `  </url>`
      );
    }
  }

  for (const trip of trips) {
    const p = `/trips/${encodeURIComponent(trip.slug)}`;
    for (const locale of ['ar', 'en'] as const) {
      const loc = `${origin}/${locale}${p}`;
      urls.push(
        `  <url>\n` +
          `    <loc>${escapeXml(loc)}</loc>\n` +
          `    <lastmod>${escapeXml(trip.updatedAt)}</lastmod>\n` +
          `    <xhtml:link rel="alternate" hreflang="ar" href="${escapeXml(`${origin}/ar${p}`)}" />\n` +
          `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${origin}/en${p}`)}" />\n` +
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}/ar${p}`)}" />\n` +
          `  </url>`
      );
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.join('\n') +
    `\n</urlset>\n`;

  res.type('application/xml').send(xml);
}
