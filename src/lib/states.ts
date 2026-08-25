/**
 * GST state codes (the first two digits of a GSTIN). They decide whether a sale
 * is intra-state (CGST + SGST) or inter-state (IGST), so brands, customers and
 * suppliers all carry one.
 */
export interface StateOption {
  code: string;
  name: string;
}

export const INDIAN_STATES: StateOption[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
  { code: "99", name: "Outside India" },
];

const BY_CODE = new Map(INDIAN_STATES.map((state) => [state.code, state]));
const BY_NAME = new Map(INDIAN_STATES.map((state) => [state.name.toLowerCase(), state]));

export const STATE_CODES = INDIAN_STATES.map((state) => state.code);

export function stateName(code: string): string {
  return BY_CODE.get(code.trim())?.name ?? "";
}

/** "29" -> "Karnataka (29)"; unknown or blank codes render as an empty string. */
export function stateLabel(code: string): string {
  const state = BY_CODE.get(code.trim());
  return state ? `${state.name} (${state.code})` : "";
}

/** Best-effort match so an existing free-text state can suggest its code. */
export function stateCodeFromName(name: string): string {
  return BY_NAME.get(name.trim().toLowerCase())?.code ?? "";
}

/** The state code embedded in the first two characters of a GSTIN. */
export function stateCodeFromGstin(gstin: string): string {
  const prefix = gstin.trim().slice(0, 2);
  return BY_CODE.has(prefix) ? prefix : "";
}

export type SupplyType = "INTRA" | "INTER" | "UNKNOWN";

/**
 * Same state means CGST + SGST, different states mean IGST. Returns UNKNOWN when
 * either side has no state code yet, so the UI can stay quiet instead of guessing.
 */
export function supplyType(fromCode: string, toCode: string): SupplyType {
  const from = fromCode.trim();
  const to = toCode.trim();
  if (!from || !to) return "UNKNOWN";
  return from === to ? "INTRA" : "INTER";
}
