/**
 * Express app factory — builds and exports the configured app WITHOUT listening.
 * `index.ts` (local dev) adds bootstrap + app.listen(); the Vercel serverless
 * function (api/index.ts) imports this app directly.
 */

import express from 'express';
import cors from 'cors';
import { config, loadServiceAccount } from './config.js';
import { logger } from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { recordsRouter } from './routes/records.js';
import { metaRouter } from './routes/meta.js';
import { pdfRouter } from './routes/pdf.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { requireAuth } from './middleware/auth.js';
import { checkSheetAccess } from './services/sheets.js';

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

// Health check — verifies the function can load credentials AND read the Sheet.
// Returns { ok: true, ... } on success, or { ok: false, error } (HTTP 500) with
// a readable reason. Never throws, so a misconfig yields a clean JSON response.
app.get('/api/health', async (_req, res) => {
  // 1. Credentials present + parseable (lazy load)?
  let serviceAccount: string;
  try {
    serviceAccount = loadServiceAccount().client_email;
  } catch (err) {
    return res.status(500).json({
      ok: false,
      service: 'scs-import-do',
      check: 'service-account',
      error: (err as Error).message,
    });
  }

  // 2. Can we actually authenticate + read the configured Sheet?
  const sheet = await checkSheetAccess();
  if (!sheet.ok) {
    return res.status(500).json({
      ok: false,
      service: 'scs-import-do',
      check: 'google-sheet',
      serviceAccount,
      sheet: { id: config.google.sheetId, tab: config.google.sheetTab },
      error: sheet.error,
      hint: `Make sure the Sheet is shared with ${serviceAccount} as Editor.`,
    });
  }

  res.json({
    ok: true,
    service: 'scs-import-do',
    time: new Date().toISOString(),
    serviceAccount,
    sheet: { id: config.google.sheetId, tab: config.google.sheetTab, title: sheet.title },
  });
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
