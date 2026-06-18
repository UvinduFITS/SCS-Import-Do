/**
 * FIELD REGISTRY — the single source of truth for the SCS IMPORT DO form.
 *
 * This ordered list drives:
 *   - form rendering (label, control type, column placement, options)
 *   - default values (incl. auto-filled "today" dates via `prefillToday`)
 *   - the Zod validation schema (see schema.ts)
 *   - the Google Sheets column order (see server/services/sheets.ts)
 *
 * Field order matches the original Bubble layout, top-to-bottom, column by column.
 * To make a field required, set `required: true`. To add/remove an option, edit constants.ts.
 */

import {
  CONTAINER_SIZE_OPTIONS,
  DEFAULT_VESSEL_DELIVERY_AGENT,
  FCL_LCL_OPTIONS,
  PASS_TYPE_OPTIONS,
} from './constants';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'phone'
  | 'date'
  | 'datetime'
  | 'radio'
  | 'checkbox'
  | 'checkboxGroup'
  | 'multiselect';

export type FieldColumn = 1 | 2 | 3;

export interface FieldDef {
  /** Programmatic key — also the Google Sheets column header and form field name. */
  key: string;
  /** Human-readable label shown in the form. */
  label: string;
  /** Control type, drives rendering + validation. */
  type: FieldType;
  /** Which form column (1 = Parties & Vessel, 2 = Delivery & Cargo, 3 = Goods & Auth). */
  column: FieldColumn;
  /** Whether the field is required. */
  required?: boolean;
  /** Default value applied on a fresh/new form. */
  defaultValue?: string | string[] | boolean;
  /** Options for radio / checkboxGroup / multiselect controls. */
  options?: readonly string[];
  /** Placeholder text for inputs. */
  placeholder?: string;
  /**
   * Auto-fill with the current date when a fresh form opens.
   * - `date` field  -> today (YYYY-MM-DD)
   * - `datetime`    -> today at 12:00 (YYYY-MM-DDT12:00)
   */
  prefillToday?: boolean;
}

export const COLUMN_TITLES: Record<FieldColumn, string> = {
  1: 'Parties & Vessel',
  2: 'Delivery Agent & Cargo',
  3: 'Goods & Authorization',
};

export const FIELDS: FieldDef[] = [
  // ───────────────────────── COLUMN 1 — PARTIES & VESSEL ─────────────────────────
  { key: 'consigneeName', label: 'Consignee Name', type: 'text', column: 1, required: true, placeholder: 'Consignee Name' },
  { key: 'consigneeAddress01', label: 'Consignee Address 01', type: 'text', column: 1, placeholder: 'Consignee Address' },
  { key: 'consigneeAddress02', label: 'Consignee Address 02', type: 'text', column: 1, placeholder: 'Consignee Address' },
  { key: 'consigneeTinNidNo', label: 'Consignee TIN / NID No', type: 'text', column: 1, placeholder: 'Consignee TIN / NID No' },
  { key: 'clearingAgentName', label: 'Clearing Agent Name', type: 'text', column: 1, placeholder: 'Clearing Agent Name' },
  { key: 'clearingAgentAddress01', label: 'Clearing Agent Address 01', type: 'text', column: 1, placeholder: 'Clearing Agent Address 01' },
  { key: 'clearingAgentAddress02', label: 'Clearing Agent Address 02', type: 'text', column: 1, placeholder: 'Clearing Agent Address 02' },
  { key: 'clearingAgentCode', label: 'Clearing Agent Code', type: 'text', column: 1, placeholder: 'Clearing Agent Code' },
  { key: 'clearingAgentTelephoneNo', label: 'Clearing Agent Telephone No', type: 'phone', column: 1, placeholder: 'Clearing Agent Telephone No' },
  { key: 'wharfClerkName', label: "Wharf Clerk's Name", type: 'text', column: 1, placeholder: "Wharf Clerk's Name" },
  { key: 'idNo', label: 'ID No', type: 'text', column: 1, placeholder: 'ID No' },
  { key: 'voyageNo', label: 'Voyage No', type: 'text', column: 1, placeholder: 'Voyage No' },
  { key: 'voyageEta', label: 'Voyage ETA', type: 'date', column: 1, prefillToday: true },
  { key: 'warehouseNumber', label: 'Warehouse Number', type: 'text', column: 1, placeholder: 'Warehouse Number' },
  { key: 'vessel', label: 'Vessel', type: 'text', column: 1, required: true, placeholder: 'Vessel' },
  { key: 'portOfLoading', label: 'Port of Loading', type: 'text', column: 1, placeholder: 'Port of Loading' },
  { key: 'cusdecNo', label: 'CUSDEC No', type: 'text', column: 1, placeholder: 'CUSDEC No' },
  { key: 'agentDoNo', label: 'Agent DO No', type: 'text', column: 1, placeholder: 'Agent DO No' },
  { key: 'serialNo', label: 'Serial No', type: 'text', column: 1, required: true, placeholder: 'Serial No' },
  { key: 'blNo', label: 'B/L No', type: 'text', column: 1, required: true, placeholder: 'B/L No' },
  { key: 'slpaDoNo', label: 'SLPA DO No', type: 'text', column: 1, placeholder: 'SLPA DO No' },
  { key: 'vesselRef', label: 'Vessel Ref', type: 'text', column: 1, placeholder: 'Vessel Ref' },
  {
    key: 'vesselDeliveryAgent',
    label: 'Vessel/Delivery Agent',
    type: 'text',
    column: 1,
    defaultValue: DEFAULT_VESSEL_DELIVERY_AGENT,
    placeholder: 'Delivery Agent',
  },

  // ──────────────────── COLUMN 2 — DELIVERY AGENT & CARGO ────────────────────
  { key: 'deliveryAgentTeleNo', label: 'Delivery Agent Tele No', type: 'phone', column: 2, defaultValue: '0114 414 000' },
  { key: 'deliveryAgentAddress1', label: 'Delivery Agent Address 1', type: 'text', column: 2, defaultValue: '344 Galle Rd' },
  { key: 'deliveryAgentAddress2', label: 'Delivery Agent Address 2', type: 'text', column: 2, defaultValue: 'Colombo 00300' },
  { key: 'doExpiresOn', label: 'DO Expires On', type: 'date', column: 2 },
  { key: 'code', label: 'Code', type: 'text', column: 2, placeholder: 'Code' },
  { key: 'dateOfLoading', label: 'Date of Loading', type: 'date', column: 2, prefillToday: true },
  { key: 'fclLclSelection', label: 'FCL / Destuffing LCL/BB', type: 'radio', column: 2, options: FCL_LCL_OPTIONS, defaultValue: 'FCL' },
  { key: 'anyOtherServices', label: 'Any Other Services', type: 'text', column: 2, placeholder: 'Any Other Services' },
  {
    key: 'containersDestuffedStuffed',
    label: 'No. of Containers Destuffed / Stuffed at Customs Unit',
    type: 'text',
    column: 2,
    placeholder: 'No. of Containers Destuffed / Stuffed',
  },
  { key: 'rentFrom', label: 'Rent From', type: 'date', column: 2, prefillToday: true },
  { key: 'rentTo', label: 'Rent To', type: 'date', column: 2, prefillToday: true },
  { key: 'overTimeFrom', label: 'Over Time From', type: 'datetime', column: 2, prefillToday: true },
  { key: 'overTimeTo', label: 'Over Time To', type: 'datetime', column: 2, prefillToday: true },
  { key: 'dangerousCargoNumberOfDays', label: 'Dangerous Cargo Number of Days', type: 'number', column: 2, placeholder: 'Dangerous Cargo Number' },
  { key: 'dangerousCargoGroup', label: 'Dangerous Cargo Group', type: 'text', column: 2, placeholder: 'Dangerous Cargo Group' },
  { key: 'dateOfLandingAndTime', label: 'Date of Landing & Time', type: 'datetime', column: 2, prefillToday: true },
  { key: 'cntrNo', label: 'CNTR NO', type: 'text', column: 2, placeholder: 'CNTR NO' },
  { key: 'marksAndNo', label: 'Marks & No', type: 'textarea', column: 2, placeholder: 'One per line' },
  { key: 'model', label: 'Model', type: 'text', column: 2, placeholder: 'Model' },
  { key: 'color', label: 'Color', type: 'text', column: 2, placeholder: 'Color' },
  { key: 'qty', label: 'QTY', type: 'number', column: 2, placeholder: 'QTY' },
  { key: 'cn', label: 'C/N', type: 'text', column: 2, placeholder: 'C/N' },
  { key: 'containerNos', label: 'Container Nos', type: 'text', column: 2, placeholder: 'Container Nos' },

  // ─────────────────── COLUMN 3 — GOODS & AUTHORIZATION ───────────────────
  { key: 'pkgType', label: 'Pkg Type', type: 'text', column: 3, placeholder: 'Pkg Type' },
  { key: 'descriptionOfGoods', label: 'Description of Goods', type: 'textarea', column: 3, placeholder: 'Description of Goods' },
  { key: 'grossWeightKg', label: 'Gross Weight Kg', type: 'text', column: 3, placeholder: 'e.g. 50.00 or 50 kgs' },
  { key: 'cbmM3', label: 'CBM M3', type: 'text', column: 3, placeholder: 'CBM M3' },
  { key: 'numberOfFclContainers', label: 'Number of FCL Containers', type: 'checkboxGroup', column: 3, options: CONTAINER_SIZE_OPTIONS },
  { key: 'cifValueRs', label: 'CIF Value Rs (if applicable)', type: 'number', column: 3 },
  { key: 'cifValueContainerSize', label: 'CIF Value — Container', type: 'checkboxGroup', column: 3, options: ['20FT', '40FT'] },
  { key: 'numberOfPkgsInWords', label: 'Number of Pkgs in Words', type: 'text', column: 3, placeholder: 'Number of Pkgs in Words' },
  { key: 'numberOfPkgsInNumbers', label: 'Number of Pkgs in Numbers', type: 'text', column: 3, placeholder: 'Number of Pkgs in Numbers' },
  { key: 'skVerifyMeasurementDcCargo', label: 'S/K Verify Measurement / D/C Cargo', type: 'text', column: 3, placeholder: 'S/K Verify Measurement / D/C Cargo' },
  { key: 'skVerifyOver40ft', label: 'S/K Verify — Over 40FT', type: 'checkbox', column: 3 },
  { key: 'skCargoReleasedUpto', label: 'SK Cargo May Be Released Upto', type: 'date', column: 3, prefillToday: true },
  { key: 'deliveryAuthorised', label: 'Delivery Authorised', type: 'datetime', column: 3, prefillToday: true },
  { key: 'deliveryAuthorisedTimeDate', label: 'Delivery Authorised Time & Date', type: 'datetime', column: 3, prefillToday: true },
  { key: 'deliveryAuthorisedPassType', label: 'Pass Type', type: 'radio', column: 3, options: PASS_TYPE_OPTIONS },
  { key: 'deliveryClerkAuthorisedUpto', label: 'Delivery Clerk Delivery Authorised Upto', type: 'datetime', column: 3, prefillToday: true },
  { key: 'forwardersDoNo', label: 'Forwarders DO No', type: 'text', column: 3, placeholder: 'Forwarders DO No' },
  { key: 'documentAttached', label: 'Document Attached', type: 'text', column: 3, placeholder: 'Document Attached' },
  { key: 'documentToBeUsedAs', label: 'Document to be Used As', type: 'textarea', column: 3, placeholder: 'Document to be used as' },
  { key: 'wrongNilMarkApplication', label: 'Wrong / Nil Mark Application', type: 'checkbox', column: 3 },
];

/** All field keys, in display/storage order. */
export const FIELD_KEYS: string[] = FIELDS.map((f) => f.key);

/** Lookup a field definition by key. */
export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f]),
);

/** Fields for a given column, in order. */
export function fieldsForColumn(column: FieldColumn): FieldDef[] {
  return FIELDS.filter((f) => f.column === column);
}

/** Keys of the required fields. */
export const REQUIRED_FIELD_KEYS: string[] = FIELDS.filter((f) => f.required).map((f) => f.key);

/** Today's date as YYYY-MM-DD (local time). */
function todayISODate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Build the set of default form values from the registry.
 * - `prefillToday` date -> today; datetime -> today at 12:00
 * - explicit `defaultValue` wins next
 * - checkboxGroup / multiselect -> []
 * - checkbox -> false
 * - everything else -> ''
 */
export function buildDefaultValues(): Record<string, string | string[] | boolean> {
  const out: Record<string, string | string[] | boolean> = {};
  for (const f of FIELDS) {
    if (f.prefillToday) {
      out[f.key] = f.type === 'datetime' ? `${todayISODate()}T12:00` : todayISODate();
    } else if (f.defaultValue !== undefined) {
      out[f.key] = f.defaultValue;
    } else if (f.type === 'checkboxGroup' || f.type === 'multiselect') {
      out[f.key] = [];
    } else if (f.type === 'checkbox') {
      out[f.key] = false;
    } else {
      out[f.key] = '';
    }
  }
  return out;
}
