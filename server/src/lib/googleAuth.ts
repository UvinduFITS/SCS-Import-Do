/**
 * Single Google auth client for the Sheets API (records + history + users live in
 * the Google Sheet). Uses google-auth-library directly + @googleapis/sheets so the
 * serverless bundle stays small (the full `googleapis` package is huge).
 */

import { GoogleAuth } from 'google-auth-library';
import { config } from '../config.js';

export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function createAuth() {
  return new GoogleAuth({
    credentials: {
      client_email: config.google.credentials.client_email,
      private_key: config.google.credentials.private_key,
    },
    scopes: GOOGLE_SCOPES,
  });
}

let auth: GoogleAuth | null = null;

export function getGoogleAuth(): GoogleAuth {
  if (!auth) auth = createAuth();
  return auth;
}
