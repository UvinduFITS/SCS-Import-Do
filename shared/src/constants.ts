/**
 * Shared constants and enumerations used by both the client and the server.
 */

/** Lifecycle of a PDF generation request for a record. */
export const PDF_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export type PdfStatus = (typeof PDF_STATUS)[keyof typeof PDF_STATUS];

export const PDF_STATUS_VALUES: PdfStatus[] = Object.values(PDF_STATUS);

/** FCL vs LCL/BB selection (radio). */
export const FCL_LCL_OPTIONS = ['FCL', 'LCL / BB'] as const;

/** Container size options reused by several checkbox groups. */
export const CONTAINER_SIZE_OPTIONS = ['20FT', '40FT', 'Over 40FT'] as const;

/** Out Pass vs Internal Pass (radio). */
export const PASS_TYPE_OPTIONS = ['Out Pass', 'Internal Pass'] as const;

/**
 * Options for the "No. of Containers Destuffed/Stuffed at Customs Unit" multi-select.
 * NOTE: These are sensible placeholders — adjust to match your operation.
 */
export const DESTUFF_STUFF_OPTIONS = [
  'Destuffed at Customs Unit',
  'Stuffed at Customs Unit',
  'Examined at Customs Unit',
  'Scanned',
] as const;

/**
 * Options for the "Document to be used as" multi-select.
 * NOTE: Placeholders — adjust to match your operation.
 */
export const DOCUMENT_USED_AS_OPTIONS = [
  'Delivery Order',
  'Gate Pass',
  'Customs Clearance',
  'Internal Reference',
] as const;

/** Default value applied to the Vessel Delivery Agent field. */
export const DEFAULT_VESSEL_DELIVERY_AGENT = 'Fits Express (PVT) Ltd';
