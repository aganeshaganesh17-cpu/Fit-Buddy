import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.js';
import { getDatabase } from './server/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialize SQLite database
  try {
    await getDatabase();
    console.log('✅ SQLite database initialized and ready.');
  } catch (err) {
    console.error('❌ Failed to initialize SQLite database:', err);
  }

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', apiRouter);

  // Vite middleware in development vs static files in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('⚡ Vite dev server middleware mounted.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      error: 'An unexpected server error occurred.',
      message: err instanceof Error ? err.message : String(err),
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FitBuddy server running on http://0.0.0.0:${PORT}`);
    console.log(`🤖 Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-3.8-flash'}`);
    console.log(`🔑 Gemini API Key configured: ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
