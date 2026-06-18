/**
 * Single Google auth client for the Sheets API (records + history + users live in
 * the Google Sheet). Uses google-auth-library directly + @googleapis/sheets so the
 * serverless bundle stays small (the full `googleapis` package is huge).
 */

import { GoogleAuth } from 'google-auth-library';
import { loadServiceAccount } from '../config.js';

export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function createAuth() {
  const creds = loadServiceAccount();
  return new GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    scopes: GOOGLE_SCOPES,
  });
}

let auth: GoogleAuth | null = null;

export function getGoogleAuth(): GoogleAuth {
  if (!auth) auth = createAuth();
  return auth;
}
