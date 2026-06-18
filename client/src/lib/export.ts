/** Export records to CSV or Excel. The xlsx library is loaded lazily (only on
 * first export) so it never bloats the initial form/history page load. */

import { SHEET_COLUMNS, type ImportDoRecord } from '@scs/shared';

/** Flatten a record into a plain string row keyed by SHEET_COLUMNS. */
function flatten(record: ImportDoRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const col of SHEET_COLUMNS) {
    const value = (record as Record<string, unknown>)[col];
    if (Array.isArray(value)) out[col] = value.join(', ');
    else if (typeof value === 'boolean') out[col] = value ? 'Yes' : 'No';
    else out[col] = value === null || value === undefined ? '' : String(value);
  }
  return out;
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

function triggerDownload(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function exportCsv(records: ImportDoRecord[]): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = records.map(flatten);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: SHEET_COLUMNS });
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `scs-import-do-${timestamp()}.csv`);
}

export async function exportExcel(records: ImportDoRecord[]): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = records.map(flatten);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: SHEET_COLUMNS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import DO History');
  XLSX.writeFile(workbook, `scs-import-do-${timestamp()}.xlsx`);
}
