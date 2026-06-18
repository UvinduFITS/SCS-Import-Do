/**
 * PDF orchestration:
 *   mark PROCESSING -> send record to n8n -> receive PDF -> mark SUCCESS
 *   (or FAILED) and return the bytes for download.
 */

import { PDF_STATUS, type ImportDoForm, type ImportDoRecord } from '@scs/shared';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getRecord, updatePdfFields } from './sheets.js';
import { generatePdfLocal } from './localPdf.js';
import { generatePdfViaAppsScript } from './appsScriptPdf.js';

export interface GeneratedPdf {
  record: ImportDoRecord;
  pdf: Buffer;
}

/**
 * Render a record to PDF. Uses the Apps Script web app (Google Slides template) when
 * APPS_SCRIPT_URL is configured; otherwise falls back to the local PDFKit renderer.
 */
function renderPdf(record: ImportDoRecord): Promise<Buffer> {
  return config.appsScript.url ? generatePdfViaAppsScript(record) : generatePdfLocal(record);
}

/** Generate (or regenerate) the PDF for a saved record via n8n and persist status. */
export async function generatePdfForRecord(recordId: string): Promise<GeneratedPdf> {
  await updatePdfFields(recordId, { pdfStatus: PDF_STATUS.PROCESSING }).catch((e) =>
    logger.warn('Could not set PROCESSING', { recordId, message: (e as Error).message }),
  );

  const record = await getRecord(recordId);

  try {
    const pdf = await renderPdf(record);
    const updated = await updatePdfFields(recordId, {
      pdfStatus: PDF_STATUS.SUCCESS,
      lastGeneratedAt: new Date().toISOString(),
    }).catch(() => ({ ...record, pdfStatus: PDF_STATUS.SUCCESS }) as ImportDoRecord);
    logger.info('PDF generated for record', { recordId, bytes: pdf.length });
    return { record: updated, pdf };
  } catch (err) {
    await updatePdfFields(recordId, { pdfStatus: PDF_STATUS.FAILED }).catch(() => undefined);
    logger.error('PDF generation failed', { recordId, message: (err as Error).message });
    throw err;
  }
}

/** Generate a PDF directly from validated form values (no saved record needed). */
export async function generatePdfFromForm(form: ImportDoForm): Promise<Buffer> {
  const record = {
    ...form,
    recordId: '',
    createdAt: '',
    updatedAt: '',
    createdByEmail: '',
    pdfStatus: '',
    pdfUrl: '',
    lastGeneratedAt: '',
  } as ImportDoRecord;
  return renderPdf(record);
}
