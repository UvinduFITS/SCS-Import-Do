/**
 * PDF rendering via a Google Apps Script web app.
 *
 * The Apps Script (apps-script/Code.gs, deployed by the user, runs AS them) copies
 * the Google Slides template, fills the [Tag] placeholders, exports a PDF, and
 * returns it as base64. This sidesteps the service-account Drive-quota limit, since
 * file creation happens in the user's own Drive. See docs/APPS_SCRIPT_SETUP.md.
 */

import type { ImportDoRecord } from '@scs/shared';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { badRequest, upstreamError } from '../lib/errors.js';
import { buildSlidesReplacements } from '../lib/slides.mapping.js';
import { safe } from '../lib/strings.js';

function pdfFilename(record: ImportDoRecord): string {
  const token = safe(String(record.serialNo || record.recordId || 'document'));
  return `${config.pdf.filenamePrefix}_${token}.pdf`;
}

/** Render a record to PDF bytes by calling the Apps Script web app. */
export async function generatePdfViaAppsScript(record: ImportDoRecord): Promise<Buffer> {
  const { url, secret, timeoutMs } = config.appsScript;
  if (!url) {
    throw badRequest('APPS_SCRIPT_URL is not configured. See docs/APPS_SCRIPT_SETUP.md');
  }
  const templateId = config.google.slidesTemplateId;
  if (!templateId) {
    throw badRequest('GOOGLE_SLIDES_TEMPLATE_ID is not configured.');
  }

  const replacements = buildSlidesReplacements(record);
  const filename = pdfFilename(record);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Apps Script web apps answer POST with a 302 to googleusercontent — follow it.
      redirect: 'follow',
      signal: controller.signal,
      body: JSON.stringify({ secret, templateId, replacements, filename }),
    });

    const text = await res.text();
    let data: { pdfBase64?: string; error?: string };
    try {
      data = JSON.parse(text) as { pdfBase64?: string; error?: string };
    } catch {
      throw upstreamError(`Apps Script did not return JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
    if (data.error) throw upstreamError(`Apps Script error: ${data.error}`);
    if (!data.pdfBase64) throw upstreamError('Apps Script returned no PDF.');

    const pdf = Buffer.from(data.pdfBase64, 'base64');
    logger.info('Apps Script PDF received', { recordId: record.recordId, bytes: pdf.length });
    return pdf;
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw upstreamError(`Apps Script timed out after ${timeoutMs}ms.`);
    }
    throw err instanceof Error ? err : upstreamError('Apps Script PDF generation failed.');
  } finally {
    clearTimeout(timer);
  }
}
