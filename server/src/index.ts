/**
 * SCS IMPORT DO — local Express server entry point.
 * Boots the Google Sheet (records + USERS tabs), seeds the first admin, and listens.
 * On Vercel the app is served by api/index.ts instead (no listen).
 */

import { app } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { ensureSheetReady } from './services/sheets.js';
import { bootstrapAdmin, ensureUsersTab } from './services/users.js';

async function start() {
  // Make sure the records + USERS tabs exist (both live in the Google Sheet) and
  // seed the first admin.
  try {
    await ensureSheetReady();
    await ensureUsersTab();
    await bootstrapAdmin();
    logger.info('Google Sheets ready', {
      recordsTab: config.google.sheetTab,
      usersTab: config.google.usersTab,
    });
  } catch (err) {
    logger.error('Could not initialise Google Sheets — check credentials & sharing', {
      message: (err as Error).message,
    });
    // Keep serving so /api/health works and the operator can diagnose.
  }

  app.listen(config.port, () => {
    logger.info('Server listening', { port: config.port, env: config.nodeEnv });
  });
}

start();
