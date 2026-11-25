import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.ts';
import { createApiRouter } from './server/routes.ts';
import { handleRobotsTxt, handleSitemapXml } from './server/seo.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

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
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }));

  // API Routes
  app.use('/api', createApiRouter());

  // Root redirect based on Accept-Language -> /ar or /en
  app.get('/', (req, res) => {
    const acceptLang = String(req.headers['accept-language'] || '').toLowerCase();
    const prefersEnglish = acceptLang.startsWith('en') && !acceptLang.includes('ar');
    res.redirect(302, prefersEnglish ? '/en' : '/ar');
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const distAssets = path.join(distDir, 'src', 'assets');
    if (fs.existsSync(distAssets)) {
      app.use('/src/assets', express.static(distAssets, { maxAge: '30d' }));
    }
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`everyDay server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
