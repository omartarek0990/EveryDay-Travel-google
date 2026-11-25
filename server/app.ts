import 'dotenv/config';
import express from 'express';
import { getDb } from './db.ts';
import { createApiRouter } from './routes.ts';
import { handleRobotsTxt, handleSitemapXml } from './seo.ts';
import { ensureLocalUploadDir } from './storage.ts';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Initialize database on boot
  getDb();

  // Security headers (CSP + Referrer-Policy + Permissions-Policy; frame-compatible for AI Studio preview)
  app.use((req, res, next) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' https://res.cloudinary.com data: blob:",
      "connect-src 'self' https://api.cloudinary.com ws: wss:",
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

  // Uploaded static images (when Cloudinary env vars are not set)
  try {
    const uploadsDir = ensureLocalUploadDir();
    app.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }));
  } catch (err) {
    console.warn('Skipping local uploads static directory:', err);
  }

  // API Routes
  app.use('/api', createApiRouter());

  return app;
}
