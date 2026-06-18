/**
 * Convert a stored record into form values suitable for the HTML controls,
 * and an API error into a user-friendly message.
 */

import { FIELDS, buildDefaultValues, type ImportDoForm, type ImportDoRecord } from '@scs/shared';
import { ApiError } from '../api/client';

/** Map a record's fields into RHF-friendly values (date/datetime trimmed for inputs). */
export function recordToForm(record: ImportDoRecord): ImportDoForm {
  const values = buildDefaultValues();
  for (const field of FIELDS) {
    const raw = (record as Record<string, unknown>)[field.key];
    switch (field.type) {
      case 'checkbox':
        values[field.key] = Boolean(raw);
        break;
      case 'checkboxGroup':
      case 'multiselect':
        values[field.key] = Array.isArray(raw) ? (raw as string[]) : [];
        break;
      case 'date':
        values[field.key] = raw ? String(raw).slice(0, 10) : '';
        break;
      case 'datetime':
        values[field.key] = raw ? String(raw).slice(0, 16) : '';
        break;
      default:
        values[field.key] = raw === null || raw === undefined ? '' : String(raw);
    }
  }
  return values as ImportDoForm;
}

export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.issues?.length) {
      return `Please fix: ${err.issues.map((i) => i.message).join('; ')}`;
    }
    return err.message;
  }
  return (err as Error)?.message || 'Something went wrong.';
}
