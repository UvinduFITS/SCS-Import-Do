/**
 * Validation schema + form/record types.
 *
 * The Zod schema is built programmatically from the FIELD REGISTRY so there is
 * exactly one place to change field behaviour. Validation rules per spec:
 *   - Required: only fields flagged `required` in fields.ts
 *   - Numbers: reject negatives, accept 0+ (stored as numeric strings)
 *   - Phones: digits, spaces, + - ( ) *
 *   - Dates/datetimes: ISO strings
 */

import { z, type ZodTypeAny } from 'zod';
import { FIELDS } from './fields';

/** Digits, spaces, plus, minus, parentheses and asterisk. Empty allowed (optional fields). */
export const PHONE_REGEX = /^[0-9+\-()*\s]*$/;

/** A field value as held by the form / stored in the sheet. */
export type FormFieldValue = string | string[] | boolean;

function fieldSchema(field: (typeof FIELDS)[number]): ZodTypeAny {
  switch (field.type) {
    case 'text':
    case 'textarea': {
      if (field.required) {
        return z
          .string({ required_error: `${field.label} is required` })
          .trim()
          .min(1, `${field.label} is required`);
      }
      return z.string().trim().default('');
    }

    case 'phone':
      return z
        .string()
        .trim()
        .refine((v) => v === '' || PHONE_REGEX.test(v), {
          message: `${field.label} may only contain digits, spaces and + - ( ) *`,
        })
        .default('');

    case 'number':
      return z
        .string()
        .trim()
        .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
          message: `${field.label} must be a number of 0 or greater`,
        })
        .default('');

    case 'date':
    case 'datetime':
      // Stored as ISO strings; emptiness allowed for optional fields.
      return z.string().trim().default('');

    case 'radio':
      // Allow the configured options or empty (no selection).
      return z
        .string()
        .trim()
        .refine((v) => v === '' || (field.options ?? []).includes(v), {
          message: `Invalid value for ${field.label}`,
        })
        .default('');

    case 'checkbox':
      return z.boolean().default(false);

    case 'checkboxGroup':
    case 'multiselect':
      return z.array(z.string()).default([]);

    default:
      return z.string().default('');
  }
}

/** The Zod object schema for the whole form, derived from the registry. */
export const importDoSchema = z.object(
  Object.fromEntries(FIELDS.map((f) => [f.key, fieldSchema(f)])) as Record<string, ZodTypeAny>,
);

/** Form values type. Keyed by field key; values are strings / string[] / booleans. */
export type ImportDoForm = Record<string, FormFieldValue>;

/** A persisted record = form values + system metadata columns. */
export interface ImportDoRecord extends ImportDoForm {
  recordId: string;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
  pdfStatus: string;
  pdfUrl: string;
  lastGeneratedAt: string;
}

/** System metadata columns that bracket the form fields in the sheet. */
export const META_LEADING_COLUMNS = ['recordId', 'createdAt', 'updatedAt', 'createdByEmail'] as const;
export const META_TRAILING_COLUMNS = ['pdfStatus', 'pdfUrl', 'lastGeneratedAt'] as const;

/**
 * Validate an arbitrary object as form input, returning parsed values.
 * Throws a ZodError on failure.
 */
export function parseImportDoForm(input: unknown): ImportDoForm {
  return importDoSchema.parse(input) as ImportDoForm;
}

/** Safe variant — returns the Zod SafeParse result. */
export function safeParseImportDoForm(input: unknown) {
  return importDoSchema.safeParse(input);
}
