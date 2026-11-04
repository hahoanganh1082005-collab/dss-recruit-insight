import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './api.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  // Mount backend API routes before Vite middlewares
  app.use('/api', apiRouter);

  // Development: Vite middlewares
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DSS Server] Recruit-Insight running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[DSS Server] Failed to start:', err);
});
