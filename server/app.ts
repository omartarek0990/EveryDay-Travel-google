import 'dotenv/config';
import 'express-async-errors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { loadDb } from './db.ts';
import { createApiRouter } from './routes.ts';
import { handleRobotsTxt, handleSitemapXml } from './seo.ts';
import { ensureLocalUploadDir } from './storage.ts';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Content lives in Supabase. Load it once per request (short in-process cache).
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/sitemap.xml') {
      try {
        await loadDb();
      } catch (err) {
        next(err);
        return;
      }
    }
    next();
  });

  // Security headers (CSP + Referrer-Policy + Permissions-Policy; frame-compatible for AI Studio preview)
  app.use((req, res, next) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
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

  // SEO endpoints
  app.get('/robots.txt', handleRobotsTxt);
  app.get('/sitemap.xml', handleSitemapXml);

  // Uploaded static images (only used when neither Supabase nor Cloudinary is configured)
  try {
    const uploadsDir = ensureLocalUploadDir();
    app.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }));
  } catch (err) {
    console.warn('Skipping local uploads static directory:', err);
  }

  // API Routes
  app.use('/api', createApiRouter());

  // Central error handler so async failures return JSON instead of hanging.
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    console.error('[server] Unhandled request error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error';

    if (req.path.startsWith('/api')) {
      res.status(500).json({ error: 'حدث خطأ في الخادم. حاول مرة أخرى.', detail: message });
    } else {
      res.status(500).type('text/plain').send('Internal Server Error');
    }
  });

  return app;
}
