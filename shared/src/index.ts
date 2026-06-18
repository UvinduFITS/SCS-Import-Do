/**
 * @scs/shared — code shared between the React client and the Express server.
 */

export * from './constants';
export * from './fields';
export * from './schema';
export * from './users';

import { FIELD_KEYS } from './fields';
import { META_LEADING_COLUMNS, META_TRAILING_COLUMNS } from './schema';

/**
 * Full, ordered list of Google Sheet columns:
 *   recordId, createdAt, updatedAt, createdByEmail, <all form fields>, pdfStatus, pdfUrl, lastGeneratedAt
 */
export const SHEET_COLUMNS: string[] = [
  ...META_LEADING_COLUMNS,
  ...FIELD_KEYS,
  ...META_TRAILING_COLUMNS,
];
