import type { CurrencyCode } from "@/types";

/** Default locale for formatting. */
const DEFAULT_LOCALE = "en-US";

/** Map of currency codes to their typical decimal places. */
const DECIMAL_OVERRIDES: Partial<Record<CurrencyCode, number>> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  IDR: 0,
  CLP: 0,
  COP: 0,
  HUF: 0,
  PKR: 0,
  NGN: 0,
};

/**
 * Format a number as a currency string using Intl.NumberFormat.
 * Uses the currency code to determine decimal places.
 */
export function formatCurrency(
  amount: number,
  code: CurrencyCode,
  locale: string = DEFAULT_LOCALE,
): string {
  const decimals = DECIMAL_OVERRIDES[code] ?? 2;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format a raw exchange rate with configurable decimal precision.
 */
export function formatRate(
  rate: number,
  decimals: number = 4,
): string {
  return rate.toFixed(decimals);
}

/**
 * Format an ISO date string as a localized human-readable date.
 */
export function formatDate(
  isoString: string,
  locale: string = DEFAULT_LOCALE,
): string {
  // Parse date-only strings (YYYY-MM-DD) in local time to avoid UTC offset issues
  const [year, month, day] = isoString.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Parse a user input string into a valid number.
 * Strips non-numeric chars (except decimal point and leading minus).
 * Returns NaN if the result is not a valid number.
 */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "-") return NaN;
  const parsed = Number(cleaned);
  return parsed;
}
