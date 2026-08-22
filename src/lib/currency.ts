export type CurrencyCode =
  | "INR"
  | "USD"
  | "EUR"
  | "GBP"
  | "AED"
  | "CAD"
  | "AUD"
  | "SGD";

export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string; locale: string }> = {
  INR: { symbol: "\u20B9", label: "Indian Rupee", locale: "en-IN" },
  USD: { symbol: "$", label: "US Dollar", locale: "en-US" },
  EUR: { symbol: "\u20AC", label: "Euro", locale: "de-DE" },
  GBP: { symbol: "\u00A3", label: "British Pound", locale: "en-GB" },
  AED: { symbol: "\u062F.\u0625", label: "UAE Dirham", locale: "ar-AE" },
  CAD: { symbol: "CA$", label: "Canadian Dollar", locale: "en-CA" },
  AUD: { symbol: "A$", label: "Australian Dollar", locale: "en-AU" },
  SGD: { symbol: "S$", label: "Singapore Dollar", locale: "en-SG" },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in CURRENCIES;
}

export function currencySymbol(code: string): string {
  return isCurrencyCode(code) ? CURRENCIES[code].symbol : code;
}

/** Formats an amount with its currency symbol, always with 2 decimals. */
export function formatMoney(amount: number, code: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const locale = isCurrencyCode(code) ? CURRENCIES[code].locale : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  const sign = safe < 0 ? "-" : "";
  return `${sign}${currencySymbol(code)}${formatted}`;
}
