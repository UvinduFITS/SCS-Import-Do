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

/**
 * Load Google service-account credentials from either the inline JSON env var
 * or a key file on disk. Inline JSON takes precedence.
 */
function loadServiceAccount(): ServiceAccountCredentials {
  const inline = optional('GOOGLE_SERVICE_ACCOUNT_JSON');
  const file = optional('GOOGLE_SERVICE_ACCOUNT_FILE');

  let raw: string | undefined;
  if (inline) {
    raw = inline;
  } else if (file) {
    try {
      raw = readFileSync(resolve(process.cwd(), file), 'utf8');
    } catch (err) {
      throw new Error(
        `Could not read GOOGLE_SERVICE_ACCOUNT_FILE at "${file}": ${(err as Error).message}`,
      );
    }
  } else {
    throw new Error(
      'Provide Google credentials via GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE. See docs/GOOGLE_SHEETS_SETUP.md',
    );
  }

  let parsed: ServiceAccountCredentials;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Google service-account credentials are not valid JSON.');
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Google service-account JSON is missing client_email / private_key.');
  }
  // Normalise escaped newlines that frequently appear in env-var-embedded keys.
  parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
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
    credentials: loadServiceAccount(),
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
