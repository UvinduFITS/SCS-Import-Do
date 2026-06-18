/**
 * Google Sheets data-access layer. The sheet named in GOOGLE_SHEET_TAB
 * (default "SCS_IMPORT_DO_HISTORY") acts as the database; one row = one record.
 *
 * Column order is defined ONCE in @scs/shared (SHEET_COLUMNS):
 *   recordId, createdAt, updatedAt, createdByEmail, <form fields…>, pdfStatus, pdfUrl, lastGeneratedAt
 */

import { sheets as sheetsApi, type sheets_v4 } from '@googleapis/sheets';
import { v4 as uuidv4 } from 'uuid';
import {
  FIELD_KEYS,
  PDF_STATUS,
  SHEET_COLUMNS,
  type ImportDoForm,
  type ImportDoRecord,
} from '@scs/shared';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { notFound } from '../lib/errors.js';
import { cellToValue, valueToCell } from '../lib/transform.js';
import { getGoogleAuth } from '../lib/googleAuth.js';

let sheetsClient: sheets_v4.Sheets | null = null;
let cachedSheetGridId: number | null = null;

/** Shared Sheets API client (used by records + users services). */
export function getSheetsApi(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;
  sheetsClient = sheetsApi({ version: 'v4', auth: getGoogleAuth() });
  return sheetsClient;
}

/**
 * Health probe: authenticate (lazy creds) and read the configured spreadsheet's
 * metadata. Returns a result object (never throws) for /api/health.
 */
export async function checkSheetAccess(): Promise<
  { ok: true; title?: string } | { ok: false; error: string }
> {
  try {
    const res = await getSheetsApi().spreadsheets.get({
      spreadsheetId: config.google.sheetId,
      fields: 'properties.title',
    });
    return { ok: true, title: res.data.properties?.title ?? undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Convert a 1-based column index to an A1 column letter (1 -> A, 27 -> AA). */
export function columnLetter(index: number): string {
  let n = index;
  let letter = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

const LAST_COLUMN = columnLetter(SHEET_COLUMNS.length);
const TAB = config.google.sheetTab;

/** Map a record object to a row array in SHEET_COLUMNS order. */
function recordToRow(record: Record<string, unknown>): string[] {
  return SHEET_COLUMNS.map((col) => valueToCell(record[col]));
}

/** Map a row array (header-aligned) back into a typed record. */
function rowToRecord(headers: string[], row: string[]): ImportDoRecord {
  const get = (col: string): string => {
    const idx = headers.indexOf(col);
    return idx >= 0 ? (row[idx] ?? '') : '';
  };

  const record: Record<string, unknown> = {
    recordId: get('recordId'),
    createdAt: get('createdAt'),
    updatedAt: get('updatedAt'),
    createdByEmail: get('createdByEmail'),
    pdfStatus: get('pdfStatus') || PDF_STATUS.PENDING,
    pdfUrl: get('pdfUrl'),
    lastGeneratedAt: get('lastGeneratedAt'),
  };

  for (const key of FIELD_KEYS) {
    record[key] = cellToValue(key, get(key));
  }

  return record as ImportDoRecord;
}

/** Resolve and cache the numeric gridId of the configured tab (needed for row deletes). */
async function getSheetGridId(): Promise<number> {
  if (cachedSheetGridId !== null) return cachedSheetGridId;
  const client = getSheetsApi();
  const meta = await client.spreadsheets.get({ spreadsheetId: config.google.sheetId });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === TAB);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw notFound(`Worksheet tab "${TAB}" not found in the spreadsheet.`);
  }
  cachedSheetGridId = sheet.properties.sheetId;
  return cachedSheetGridId;
}

/**
 * Ensure a tab exists and its header row matches `headers`. Creates the tab and/or
 * writes the header row if needed. Safe to call on every startup. Reused for both
 * the records tab and the USERS tab.
 */
export async function ensureTab(tab: string, headers: string[]): Promise<void> {
  const client = getSheetsApi();
  const meta = await client.spreadsheets.get({ spreadsheetId: config.google.sheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab);

  if (!exists) {
    logger.info('Creating worksheet tab', { tab });
    await client.spreadsheets.batchUpdate({
      spreadsheetId: config.google.sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    if (tab === TAB) cachedSheetGridId = null;
  }

  const headerRange = `${tab}!A1:${columnLetter(headers.length)}1`;
  const current = await client.spreadsheets.values.get({
    spreadsheetId: config.google.sheetId,
    range: headerRange,
  });
  const existingHeaders = current.data.values?.[0] ?? [];

  const matches =
    existingHeaders.length === headers.length && headers.every((c, i) => existingHeaders[i] === c);

  if (!matches) {
    logger.info('Writing header row', { tab, columns: headers.length });
    await client.spreadsheets.values.update({
      spreadsheetId: config.google.sheetId,
      range: headerRange,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
}

/** Ensure the records tab is ready. Safe to call on every startup. */
export async function ensureSheetReady(): Promise<void> {
  await ensureTab(TAB, SHEET_COLUMNS);
}

/** Read every data row, returning records plus a recordId -> sheet row number map. */
async function readAll(): Promise<{ headers: string[]; records: ImportDoRecord[]; rowById: Map<string, number> }> {
  const client = getSheetsApi();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: config.google.sheetId,
    range: `${TAB}!A1:${LAST_COLUMN}`,
  });
  const values = res.data.values ?? [];
  const headers = (values[0] as string[]) ?? SHEET_COLUMNS;
  const records: ImportDoRecord[] = [];
  const rowById = new Map<string, number>();

  for (let i = 1; i < values.length; i++) {
    const row = values[i] as string[];
    if (!row || row.every((c) => c === '' || c === undefined)) continue;
    const record = rowToRecord(headers, row);
    if (!record.recordId) continue;
    records.push(record);
    rowById.set(record.recordId, i + 1); // sheet rows are 1-based; +1 because header is row 1 (index 0)
  }

  return { headers, records, rowById };
}

/** List all records, newest first. */
export async function listRecords(): Promise<ImportDoRecord[]> {
  const { records } = await readAll();
  return records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Get a single record by id. */
export async function getRecord(recordId: string): Promise<ImportDoRecord> {
  const { records } = await readAll();
  const record = records.find((r) => r.recordId === recordId);
  if (!record) throw notFound(`Record ${recordId} not found.`);
  return record;
}

/** Create a new record from validated form values. Always generates a fresh recordId. */
export async function createRecord(form: ImportDoForm, createdByEmail: string): Promise<ImportDoRecord> {
  const client = getSheetsApi();
  const now = new Date().toISOString();
  const record: ImportDoRecord = {
    ...form,
    recordId: uuidv4(),
    createdAt: now,
    updatedAt: now,
    createdByEmail: createdByEmail || '',
    pdfStatus: PDF_STATUS.PENDING,
    pdfUrl: '',
    lastGeneratedAt: '',
  } as ImportDoRecord;

  await client.spreadsheets.values.append({
    spreadsheetId: config.google.sheetId,
    range: `${TAB}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [recordToRow(record)] },
  });

  logger.info('Record created', { recordId: record.recordId });
  return record;
}

/** Patch an existing record (partial update). Bumps updatedAt. */
export async function updateRecord(
  recordId: string,
  patch: Partial<ImportDoRecord>,
): Promise<ImportDoRecord> {
  const client = getSheetsApi();
  const { records, rowById } = await readAll();
  const existing = records.find((r) => r.recordId === recordId);
  const rowNumber = rowById.get(recordId);
  if (!existing || !rowNumber) throw notFound(`Record ${recordId} not found.`);

  const updated: ImportDoRecord = {
    ...existing,
    ...patch,
    recordId, // never reassign
    updatedAt: new Date().toISOString(),
  };

  await client.spreadsheets.values.update({
    spreadsheetId: config.google.sheetId,
    range: `${TAB}!A${rowNumber}:${LAST_COLUMN}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [recordToRow(updated)] },
  });

  logger.info('Record updated', { recordId });
  return updated;
}

/** Convenience helper for the PDF flow. */
export async function updatePdfFields(
  recordId: string,
  fields: { pdfStatus: string; pdfUrl?: string; lastGeneratedAt?: string },
): Promise<ImportDoRecord> {
  return updateRecord(recordId, {
    pdfStatus: fields.pdfStatus,
    ...(fields.pdfUrl !== undefined ? { pdfUrl: fields.pdfUrl } : {}),
    ...(fields.lastGeneratedAt !== undefined ? { lastGeneratedAt: fields.lastGeneratedAt } : {}),
  });
}

/** Delete a record (removes its row). */
export async function deleteRecord(recordId: string): Promise<void> {
  const client = getSheetsApi();
  const { rowById } = await readAll();
  const rowNumber = rowById.get(recordId);
  if (!rowNumber) throw notFound(`Record ${recordId} not found.`);

  const gridId = await getSheetGridId();
  await client.spreadsheets.batchUpdate({
    spreadsheetId: config.google.sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: gridId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // 0-based, inclusive
              endIndex: rowNumber, // exclusive
            },
          },
        },
      ],
    },
  });

  logger.info('Record deleted', { recordId });
}
