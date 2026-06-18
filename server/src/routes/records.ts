/**
 * /api/records — CRUD + PDF generation + duplicate.
 *
 * "Create PDF" on the form calls POST /api/records with generate=true: it creates
 * a NEW row and returns the generated PDF (base64) for immediate download.
 * "Load Into Form" / "Duplicate" never mutate the source — they always create a
 * brand-new record.
 */

import { Router } from 'express';
import { FIELD_KEYS, importDoSchema, type ImportDoForm, type ImportDoRecord } from '@scs/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { badRequest } from '../lib/errors.js';
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord,
} from '../services/sheets.js';
import { generatePdfForRecord, generatePdfFromForm } from '../services/pdf.js';
import { safe } from '../lib/strings.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

export const recordsRouter = Router();

function validateForm(body: unknown): ImportDoForm {
  const candidate =
    body && typeof body === 'object' && 'form' in (body as Record<string, unknown>)
      ? (body as Record<string, unknown>).form
      : body;
  return importDoSchema.parse(candidate) as ImportDoForm;
}

function pickFormFields(record: Record<string, unknown>): ImportDoForm {
  const form: Record<string, unknown> = {};
  for (const key of FIELD_KEYS) form[key] = record[key];
  return importDoSchema.parse(form) as ImportDoForm;
}

function pdfFilename(record: { serialNo?: unknown; recordId?: unknown }): string {
  const token = safe(String(record.serialNo || record.recordId || 'document'));
  return `${config.pdf.filenamePrefix}_${token}.pdf`;
}

// GET /api/records — list all (newest first).
recordsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const records = await listRecords();
    res.json({ records, count: records.length });
  }),
);

// GET /api/records/:id — fetch one record.
recordsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const record = await getRecord(req.params.id);
    res.json({ record });
  }),
);

// GET /api/records/:id/pdf — (re)generate and STREAM the PDF as a download.
recordsRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const { record, pdf } = await generatePdfForRecord(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename(record)}"`);
    res.send(pdf);
  }),
);

// POST /api/records — create a NEW record. { form, createdByEmail, generate? }.
// generate=true also produces the PDF and returns it as base64 for download.
// Saving to the history Sheet is best-effort: a Sheets failure (e.g. the sheet
// isn't shared yet) does NOT block PDF generation/download — `savedToHistory`
// tells the client which happened.
recordsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const form = validateForm(req.body);
    const createdByEmail = req.user?.email ?? '';
    const generate = Boolean(req.body?.generate);

    let record: ImportDoRecord | null = null;
    let savedToHistory = true;
    try {
      record = await createRecord(form, createdByEmail);
    } catch (err) {
      savedToHistory = false;
      logger.warn('Could not save record to history; continuing to PDF', {
        message: (err as Error).message,
      });
    }

    let pdfBase64: string | undefined;
    if (generate) {
      if (record) {
        const result = await generatePdfForRecord(record.recordId);
        record = result.record;
        pdfBase64 = result.pdf.toString('base64');
      } else {
        // No saved record (Sheet unavailable) — render straight from the form.
        const pdf = await generatePdfFromForm(form);
        pdfBase64 = pdf.toString('base64');
      }
    }

    const nameToken = (record ?? form) as { serialNo?: unknown; recordId?: unknown };
    res.status(201).json({ record, pdfBase64, filename: pdfFilename(nameToken), savedToHistory });
  }),
);

// PUT /api/records/:id — update an existing record's form fields.
recordsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const form = validateForm(req.body);
    const record = await updateRecord(req.params.id, form);
    res.json({ record });
  }),
);

// POST /api/records/:id/generate-pdf — (re)generate; returns base64 + updates status.
recordsRouter.post(
  '/:id/generate-pdf',
  asyncHandler(async (req, res) => {
    const { record, pdf } = await generatePdfForRecord(req.params.id);
    res.json({ record, pdfBase64: pdf.toString('base64'), filename: pdfFilename(record) });
  }),
);

// POST /api/records/:id/duplicate — clone a record's values into a NEW record.
recordsRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const source = await getRecord(req.params.id);
    const form = pickFormFields(source as unknown as Record<string, unknown>);
    const createdByEmail = req.user?.email ?? source.createdByEmail ?? '';
    const record = await createRecord(form, createdByEmail);
    res.status(201).json({ record });
  }),
);

// DELETE /api/records/:id — remove a record.
recordsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!req.params.id) throw badRequest('Missing record id.');
    await deleteRecord(req.params.id);
    res.json({ ok: true });
  }),
);
