/**
 * Express app factory — builds and exports the configured app WITHOUT listening.
 * `index.ts` (local dev) adds bootstrap + app.listen(); the Vercel serverless
 * function (api/index.ts) imports this app directly.
 */

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { recordsRouter } from './routes/records.js';
import { metaRouter } from './routes/meta.js';
import { pdfRouter } from './routes/pdf.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { requireAuth } from './middleware/auth.js';

export const app = express();

app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

// Request logging (lightweight).
app.use((req, _res, next) => {
  logger.debug('Request', { method: req.method, path: req.path });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'scs-import-do', time: new Date().toISOString() });
});

// Auth (login is public; /me + /change-password enforce auth inside the router).
app.use('/api/auth', authRouter);

// Protected data routes — require a valid JWT.
app.use('/api/meta', requireAuth, metaRouter);
app.use('/api/records', requireAuth, recordsRouter);
app.use('/api/pdf', requireAuth, pdfRouter);

// Admin-only user management (auth + admin enforced inside the router).
app.use('/api/users', usersRouter);

// 404 for unknown API routes.
app.use('/api', (_req, res) => res.status(404).json({ error: 'NotFound', message: 'Unknown endpoint.' }));

app.use(errorHandler);

export default app;
