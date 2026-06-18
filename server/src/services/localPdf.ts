/**
 * In-system PDF rendering with PDFKit — no Google Drive, no external service.
 *
 * Builds a Delivery Order document from a record using the shared field registry
 * (labels + column grouping), so it always stays in sync with the form. Values are
 * cleaned to strings via the same transform used elsewhere.
 *
 * This is a clean, self-contained layout — not a pixel match of the SLPA form.
 */

import PDFDocument from 'pdfkit';
import { COLUMN_TITLES, FIELDS, type FieldColumn, type ImportDoRecord } from '@scs/shared';
import { valueToDisplayString } from '../lib/transform.js';

const BRAND = '#1e3a8a';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

function val(record: ImportDoRecord, key: string): string {
  return valueToDisplayString(key, (record as unknown as Record<string, unknown>)[key]);
}

export function generatePdfLocal(record: ImportDoRecord): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 32,
      info: { Title: `Delivery Order ${record.serialNo ?? ''}`.trim(), Author: 'SCS Import DO' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentW = right - left;
    const gap = 14;
    const colW = (contentW - gap) / 2;
    const colX = [left, left + colW + gap];
    const rowH = 28;
    const bottom = () => doc.page.height - doc.page.margins.bottom;

    let y = doc.page.margins.top;
    let cell = 0; // 0 = left column, 1 = right column

    // ── Header ──────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(20).fillColor(BRAND).text('DELIVERY ORDER', left, y, {
      width: contentW,
      align: 'center',
    });
    y = doc.y + 2;
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('FITS EXPRESS (PVT) LTD', left, y, {
      width: contentW,
      align: 'center',
    });
    y = doc.y + 10;

    // ── Key identifiers strip ────────────────────────────────────────────────
    const ids: Array<[string, string]> = [
      ['Serial No', val(record, 'serialNo')],
      ['Agent DO No', val(record, 'agentDoNo')],
      ['B/L No', val(record, 'blNo')],
      ['Vessel', val(record, 'vessel')],
    ];
    const idW = (contentW - gap * (ids.length - 1)) / ids.length;
    doc.rect(left, y, contentW, 34).fill('#f1f5f9');
    ids.forEach(([label, value], i) => {
      const x = left + i * (idW + gap);
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(label.toUpperCase(), x + 6, y + 6, { width: idW - 12, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(value || '—', x + 6, y + 16, { width: idW - 12, lineBreak: false, ellipsis: true });
    });
    y += 34 + 12;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const ensure = (h: number) => {
      if (y + h > bottom()) {
        doc.addPage();
        y = doc.page.margins.top;
        cell = 0;
      }
    };

    const sectionTitle = (title: string) => {
      if (cell === 1) { y += rowH; cell = 0; } // flush a dangling left cell
      ensure(24);
      doc.rect(left, y, contentW, 17).fill(BRAND);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(title.toUpperCase(), left + 7, y + 5, { width: contentW - 14, lineBreak: false });
      y += 22;
      cell = 0;
    };

    const fieldCell = (label: string, value: string) => {
      ensure(rowH);
      const x = colX[cell];
      doc.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(label.toUpperCase(), x, y, { width: colW, lineBreak: false, ellipsis: true });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(value || '—', x, y + 9, { width: colW, lineBreak: false, ellipsis: true });
      doc.moveTo(x, y + rowH - 6).lineTo(x + colW, y + rowH - 6).lineWidth(0.5).strokeColor(LINE).stroke();
      if (cell === 0) cell = 1;
      else { cell = 0; y += rowH; }
    };

    // ── Sections (driven by the shared field registry) ──────────────────────
    for (const col of [1, 2, 3] as FieldColumn[]) {
      sectionTitle(COLUMN_TITLES[col]);
      for (const f of FIELDS.filter((x) => x.column === col)) {
        fieldCell(f.label, val(record, f.key));
      }
    }
    if (cell === 1) y += rowH;

    // ── Footer meta ────────────────────────────────────────────────────────
    ensure(24);
    y += 8;
    const generated = new Date().toISOString().slice(0, 16).replace('T', ' ');
    doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(
      `Record ${record.recordId || '—'}   ·   Created by ${record.createdByEmail || '—'}   ·   Generated ${generated} UTC`,
      left,
      y,
      { width: contentW },
    );

    doc.end();
  });
}
