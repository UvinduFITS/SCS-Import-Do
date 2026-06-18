/**
 * Data transformation helpers used when (a) writing rows to Google Sheets and
 * (b) building the Portant payload. Implements the spec's transformation rules:
 *   - convert all values to strings
 *   - format dates consistently
 *   - trim whitespace
 *   - strip control characters
 *   - arrays -> comma-separated strings
 *   - null/undefined -> empty string
 */

import { FIELD_BY_KEY } from '@scs/shared';

/** Replace ASCII control characters (0x00–0x1F and 0x7F) with spaces. */
function stripControlChars(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    out += code <= 0x1f || code === 0x7f ? ' ' : input[i];
  }
  return out;
}

/** Remove ASCII control characters (tabs/newlines included) and collapse whitespace. */
export function cleanText(input: string): string {
  return stripControlChars(input).replace(/\s+/g, ' ').trim();
}

/** Format a date string as YYYY-MM-DD. Keeps a local YYYY-MM-DD as-is (no TZ shift). */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso.trim());
  if (m) return m[1];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return cleanText(iso);
  return d.toISOString().slice(0, 10);
}

/**
 * Format a datetime as YYYY-MM-DD HH:mm. A local "datetime-local" value
 * (YYYY-MM-DDTHH:mm) is kept verbatim — no timezone conversion — so a 12:00
 * value prints as 12:00.
 */
export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(iso.trim());
  if (m) return `${m[1]} ${m[2]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return cleanText(iso);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Convert any stored value into a clean display string, using the field type
 * (from the registry) to decide formatting. Used by the Portant mapper.
 */
export function valueToDisplayString(key: string, value: unknown): string {
  if (value === null || value === undefined) return '';

  const field = FIELD_BY_KEY[key];
  const type = field?.type;

  if (Array.isArray(value)) {
    return value.map((v) => cleanText(String(v))).filter(Boolean).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  const str = String(value);
  if (str.trim() === '') return '';

  if (type === 'date') return formatDate(str);
  if (type === 'datetime') return formatDateTime(str);

  // Multi-line fields (e.g. Marks & No, Description) keep their line breaks so the
  // PDF renders them line by line; each line is still cleaned/trimmed individually.
  if (type === 'textarea') {
    return str
      .split(/\r?\n/)
      .map((line) => cleanText(line))
      .join('\n')
      .replace(/^\n+|\n+$/g, '');
  }

  return cleanText(str);
}

/**
 * Convert a value into the raw string stored in a Google Sheet cell.
 * Arrays are JSON-encoded so they round-trip back into arrays on read.
 */
export function valueToCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

/** Parse a Google Sheet cell back into a typed value, using the field type. */
export function cellToValue(key: string, cell: string): string | string[] | boolean {
  const type = FIELD_BY_KEY[key]?.type;
  const raw = cell ?? '';

  if (type === 'checkbox') {
    return raw === 'TRUE' || raw === 'true' || raw === 'Yes';
  }

  if (type === 'checkboxGroup' || type === 'multiselect') {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Fallback: comma-separated legacy values.
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }

  return raw;
}
