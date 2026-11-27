import 'dotenv/config';
import 'express-async-errors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { applyApiCacheHeaders } from './cache-headers.ts';
import { buildLandingPayload, buildTripPayload, getDb, loadDb } from './db.ts';
import { loadHtmlTemplate, safeRenderShell } from './html-shell.ts';
import { createApiRouter } from './routes.ts';
import { handleRobotsTxt, handleSitemapXml } from './seo.ts';
import { getSupabaseUrl, isSupabaseConfigured } from './supabase.ts';
import { ensureLocalUploadDir } from './storage.ts';

const HTML_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';
const HTML_FAILSAFE_CACHE_CONTROL = 'public, max-age=0, s-maxage=5';

function localeFromPath(path: string): 'ar' | 'en' {
  return path.startsWith('/en') ? 'en' : 'ar';
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Content lives in Supabase. Load it once per request (short in-process cache).
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/sitemap.xml' || isHtmlRoute(req.path)) {
      try {
        await loadDb();
      } catch (err) {
        // HTML routes must never go blank: the shell falls back to the plain template.
        if (!isHtmlRoute(req.path)) {
          next(err);
          return;
        }
        console.error('[html-shell] database unavailable, serving the plain shell:', err);
      }
    }
    next();
  });

  // Security headers (CSP + Referrer-Policy + Permissions-Policy; frame-compatible for AI Studio preview)
  app.use((req, res, next) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' https://res.cloudinary.com https://*.supabase.co data: blob:",
      "connect-src 'self' https://api.cloudinary.com https://*.supabase.co ws: wss:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.path.startsWith('/admin') || req.path.startsWith('/api/')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Root redirect based on Accept-Language -> /ar or /en
  app.get('/', (req, res) => {
    const acceptLang = String(req.headers['accept-language'] || '').toLowerCase();
    const prefersEnglish = acceptLang.startsWith('en') && !acceptLang.includes('ar');
    res.redirect(302, prefersEnglish ? '/en' : '/ar');
  });

  // Minimal HTML shell with the slim payload injected (degrades to the plain template).
  app.get(
    [/^\/ar$/, /^\/en$/, /^\/ar\/.*/, /^\/en\/.*/],
    (req: Request, res: Response, next: NextFunction) => {
      const locale = localeFromPath(req.path);
      const template = loadHtmlTemplate();
      if (!template && process.env.NODE_ENV !== 'production') {
        // Dev server: let Vite's middleware serve the HTML instead.
        next();
        return;
      }
      const origin = requestOrigin(req);

      let landing;
      try {
        landing = buildLandingPayload(getDb());
      } catch (error) {
        console.error('[html-shell] payload unavailable, serving the plain shell:', error);
        servePlainShell(res, template);
        return;
      }

      const tripMatch = /^\/(?:ar|en)\/trips\/([^/]+)\/?$/.exec(req.path);
      let trip = null;
      if (tripMatch) {
        try {
          trip = buildTripPayload(getDb(), decodeURIComponent(tripMatch[1]));
        } catch (error) {
          console.error('[html-shell] trip lookup failed:', error);
        }
      }

      const rendered = safeRenderShell({
        template,
        locale,
        origin,
        path: req.path,
        landing,
        trip,
        supabaseOrigin: isSupabaseConfigured() ? getSupabaseUrl() : null,
      });

      if (!rendered.injected) {
        servePlainShell(res, template);
        return;
      }

      res.setHeader('Cache-Control', HTML_CACHE_CONTROL);
      res.type('html').send(rendered.html);
    }
  );

  // SEO endpoints
  app.get('/robots.txt', handleRobotsTxt);
  app.get('/sitemap.xml', handleSitemapXml);

  // Uploaded static images (only used when neither Supabase nor Cloudinary is configured).
  // File names are content-unique, so they can be cached for a year.
  try {
    const uploadsDir = ensureLocalUploadDir();
    app.use('/uploads', express.static(uploadsDir, { maxAge: '365d', immutable: true }));
  } catch (err) {
    console.warn('Skipping local uploads static directory:', err);
  }

  // API cache policy (public payload vs. private admin/auth/upload routes)
  app.use(applyApiCacheHeaders);

  // API Routes
  app.use('/api', createApiRouter());

  // Central error handler so async failures return JSON instead of hanging.
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status = apiErrorStatus(err);
    // Client mistakes (oversized body, bad JSON) must not look like server crashes.
    if (status >= 500) {
      console.error('[server] Unhandled request error:', err);
    } else {
      console.warn(`[server] Rejected request (${status}) on ${req.method} ${req.path}`);
    }

    if (req.path.startsWith('/api')) {
      // Never let the CDN cache an error response, and never leak internals.
      res.setHeader('Cache-Control', 'no-store');
      res.status(status).json({ error: apiErrorMessage(status) });
    } else {
      res.status(status).type('text/plain').send(status >= 500 ? 'Internal Server Error' : 'Bad Request');
    }
  });

  return app;
}

/**
 * HTTP status to answer with. Body-parser and other Express middleware put the
 * intended status on the error (`status` / `statusCode`); anything else is a
 * genuine 500.
 */
export function apiErrorStatus(err: unknown): number {
  const source = err as { status?: unknown; statusCode?: unknown } | null;
  const raw = source?.status ?? source?.statusCode;
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(value) || value < 400 || value > 599) return 500;
  return value;
}

/** Arabic, user-facing message. Never contains internal detail. */
export function apiErrorMessage(status: number): string {
  if (status === 413) return 'حجم البيانات المرسلة أكبر من المسموح.';
  if (status === 400) return 'بيانات غير صالحة.';
  if (status === 401) return 'غير مصرح. يرجى تسجيل الدخول.';
  if (status === 403) return 'غير مسموح بهذا الطلب.';
  if (status === 404) return 'العنصر المطلوب غير موجود.';
  if (status === 429) return 'طلبات كثيرة جداً. حاول بعد قليل.';
  return 'حدث خطأ في الخادم. حاول مرة أخرى.';
}

function isHtmlRoute(path: string): boolean {
  return /^\/($|ar(\/|$)|en(\/|$))/.test(path);
}

function requestOrigin(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  if (host) return `${proto}://${host}`;
  const configured = process.env.APP_URL || process.env.VITE_SITE_URL;
  if (configured && configured.startsWith('http')) return configured.replace(/\/+$/, '');
  return 'http://localhost:3000';
}

function servePlainShell(res: Response, template: string | null): void {
  res.setHeader('Cache-Control', HTML_FAILSAFE_CACHE_CONTROL);
  if (!template) {
    res.status(503).type('text/plain').send('Service unavailable');
    return;
  }
  res.type('html').send(template);
}

// Exported for tests and the verification script.
export { HTML_CACHE_CONTROL };
