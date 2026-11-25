import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.ts';

async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

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
