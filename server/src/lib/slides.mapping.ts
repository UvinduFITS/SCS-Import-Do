/**
 * GOOGLE SLIDES TAG MAP
 * ---------------------
 * Maps each form field to the placeholder TAG used in the Slides template, which
 * writes tags as `{{Tag}}`. These names were read directly from the template
 * (1PxjP7…) — all 37 placeholders are covered. Edit here if you change the template.
 *
 * Values are cleaned to strings first (dates YYYY-MM-DD, datetimes YYYY-MM-DD HH:mm,
 * multi-selects comma-joined, booleans Yes/No, empty -> "").
 *
 * NOTE — form fields with NO placeholder in the current template (so they won't show
 * up on the PDF until you add a tag): Consignee TIN/NID, Clearing Agent Address/Code,
 * Voyage No (only Voyage_Date exists), CNTR No, Model/Color/QTY/C/N, Rent/Over-time,
 * Dangerous Cargo, Date of Landing, Number of FCL (only the 2/4/5 boxes), and most of
 * the lower authorization fields. Add a `{{Tag}}` to the slide + an entry below to include any.
 */

import { FIELD_KEYS, type ImportDoRecord } from '@scs/shared';
import { valueToDisplayString } from './transform.js';

/** Delimiters wrapping a tag in the template: {{Tag}}. */
export const TAG_OPEN = '{{';
export const TAG_CLOSE = '}}';

/** formFieldKey -> exact template tag name (without the {{ }} delimiters). */
export const SLIDES_FIELD_TAGS: Record<string, string> = {
  consigneeName: 'Consignee_Name',
  consigneeAddress01: 'Consignee_Address 01',
  consigneeAddress02: 'Consignee_Address 02',
  clearingAgentName: 'Clearing_Agent_Name',
  clearingAgentTelephoneNo: 'Clearing_Agent_Telephone No',
  warehouseNumber: 'Warehouse_No',
  voyageNo: 'Voyage_Num',
  voyageEta: 'Voyage_Date',
  vessel: 'Vessel',
  portOfLoading: 'Port_of_Loading',
  cusdecNo: 'CUSDEC_No',
  agentDoNo: 'Agent_DO_No',
  serialNo: 'Serial_No',
  blNo: 'BL_No',
  slpaDoNo: 'SLPA_DO_No',
  vesselRef: 'Vessel_Ref',
  vesselDeliveryAgent: 'Vessel_Delivery_Agent',
  deliveryAgentTeleNo: 'Vessel_Tele_No',
  deliveryAgentAddress1: 'Vessel_Delivery_Address_1',
  deliveryAgentAddress2: 'Vessel_Delivery_Address_2',
  doExpiresOn: 'DO_Expires_On',
  anyOtherServices: 'Any_Other_Services',
  marksAndNo: 'Marks_Nos',
  containerNos: 'Container_No',
  pkgType: 'Pkg_Type',
  descriptionOfGoods: 'Description_of_Goods',
  grossWeightKg: 'Gross_Weight_Kg',
  cbmM3: 'CBM_M3',
  cifValueRs: 'CIF_Value',
  numberOfPkgsInWords: 'Number_of_Pkgs_In_Words',
  numberOfPkgsInNumbers: 'Number_of_Pkgs_In_Number',
  skVerifyMeasurementDcCargo: 'SK_Verify_Measurement_DC_Cargo',
  deliveryAuthorised: 'Delivery_Authorised',
  forwardersDoNo: 'Forwarders_DO_No',
};

/** Build a `{{Tag}}` -> value map for the template. Covers all 37 placeholders. */
export function buildSlidesReplacements(record: ImportDoRecord): Record<string, string> {
  const out: Record<string, string> = {};
  const rec = record as unknown as Record<string, unknown>;
  const put = (tagName: string, value: string) => {
    out[`${TAG_OPEN}${tagName}${TAG_CLOSE}`] = value;
  };

  // 1:1 field tags.
  for (const key of FIELD_KEYS) {
    const tag = SLIDES_FIELD_TAGS[key];
    if (tag) put(tag, valueToDisplayString(key, rec[key]));
  }

  // Combined: Wharf Clerk Name + ID No (one tag in the template).
  const wharf = [
    valueToDisplayString('wharfClerkName', rec.wharfClerkName),
    valueToDisplayString('idNo', rec.idNo),
  ]
    .filter(Boolean)
    .join(' / ');
  put('Wharf_Clerk_Name_ID_No', wharf);

  // FCL container-size boxes: {{2}}=20FT, {{4}}=40FT, {{5}}=Over 40FT.
  // Marks "X" for each size selected in `numberOfFclContainers`.
  // (Confirm this matches what your template's 2/4/5 boxes expect.)
  const sizes = Array.isArray(rec.numberOfFclContainers) ? (rec.numberOfFclContainers as string[]) : [];
  put('2', sizes.includes('20FT') ? 'X' : '');
  put('4', sizes.includes('40FT') ? 'X' : '');
  put('5', sizes.includes('Over 40FT') ? 'X' : '');

  return out;
}
