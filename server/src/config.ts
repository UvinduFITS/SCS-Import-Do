/**
 * Centralised, validated environment configuration.
 * All secrets live here and NEVER leave the server.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example / docs/ENVIRONMENT_SETUP.md`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback = ''): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
}

let cachedCreds: ServiceAccountCredentials | null = null;

/**
 * Load Google service-account credentials. LAZY + cached — called on first use,
 * never at module import — so a missing/invalid key surfaces as a clean runtime
 * error (returned as JSON, e.g. from /api/health) instead of crashing the whole
 * serverless function at startup.
 *
 * Source order:
 *   1. GOOGLE_SERVICE_ACCOUNT_JSON — the full key JSON in an env var (production / Vercel)
 *   2. GOOGLE_SERVICE_ACCOUNT_FILE — path to a key file on disk (LOCAL DEV ONLY; there
 *      is no filesystem on Vercel serverless)
 * Throws a descriptive error if neither is available.
 */
export function loadServiceAccount(): ServiceAccountCredentials {
  if (cachedCreds) return cachedCreds;

  const inline = optional('GOOGLE_SERVICE_ACCOUNT_JSON');
  const file = optional('GOOGLE_SERVICE_ACCOUNT_FILE');

  let raw: string;
  if (inline) {
    raw = inline; // production / Vercel
  } else if (file) {
    try {
      raw = readFileSync(resolve(process.cwd(), file), 'utf8'); // local dev only
    } catch (err) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_FILE is set to "${file}" but the file could not be read ` +
          `(${(err as Error).message}). On Vercel/production there is no filesystem — set ` +
          `GOOGLE_SERVICE_ACCOUNT_JSON (the full key JSON on one line) instead.`,
      );
    }
  } else {
    throw new Error(
      'No Google service-account credentials configured. Set GOOGLE_SERVICE_ACCOUNT_JSON ' +
        '(full key JSON — recommended for Vercel/production) or, for local dev only, ' +
        'GOOGLE_SERVICE_ACCOUNT_FILE (path to the key file). See docs/GOOGLE_SHEETS_SETUP.md.',
    );
  }

  let parsed: ServiceAccountCredentials;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'Google service-account credentials are not valid JSON. For GOOGLE_SERVICE_ACCOUNT_JSON, ' +
        'paste the entire key-file contents as a single line.',
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Google service-account JSON is missing "client_email" / "private_key".');
  }
  // Env vars often store the private key with escaped "\n" — restore real newlines.
  parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');

  cachedCreds = parsed;
  return parsed;
}

export const config = {
  port: optionalNumber('PORT', 4000),
  nodeEnv: optional('NODE_ENV', 'development'),
  corsOrigins: optional('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  google: {
    sheetId: required('GOOGLE_SHEET_ID'),
    sheetTab: optional('GOOGLE_SHEET_TAB', 'SCS_IMPORT_DO_HISTORY'),
    // Users/login live in this tab of the same spreadsheet (bcrypt password hashes).
    usersTab: optional('GOOGLE_USERS_TAB', 'USERS'),
    // NOTE: credentials are loaded lazily via loadServiceAccount() (above), NOT here,
    // so a bad/missing key doesn't crash the function at import.
    // The Slides template id, passed to the Apps Script web app to fill + export.
    slidesTemplateId: optional('GOOGLE_SLIDES_TEMPLATE_ID'),
  },

  // Apps Script web app that renders the PDF from the Slides template (runs as the
  // user, so no service-account Drive quota issue). See docs/APPS_SCRIPT_SETUP.md.
  appsScript: {
    url: optional('APPS_SCRIPT_URL'),
    secret: optional('APPS_SCRIPT_SECRET'),
    timeoutMs: optionalNumber('APPS_SCRIPT_TIMEOUT_MS', 60000),
  },

  auth: {
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
    // First-run admin seed: created automatically if the USERS tab is empty.
    bootstrapAdmin: {
      email: optional('ADMIN_EMAIL'),
      password: optional('ADMIN_PASSWORD'),
      name: optional('ADMIN_NAME', 'Administrator'),
    },
  },

  pdf: {
    filenamePrefix: optional('PDF_FILENAME_PREFIX', 'DO'),
  },
} as const;

export type AppConfig = typeof config;
