import type { CurrencyCode, ExchangeRates } from "@/types";

/**
 * Convert an amount from one currency to another using their USD rates.
 * Formula: result = amount * (toRate / fromRate)
 */
export function convert(
  amount: number,
  fromRate: number,
  toRate: number,
): number {
  if (fromRate === 0) {
    throw new Error("fromRate cannot be zero");
  }
  return (amount * toRate) / fromRate;
}

/**
 * Convert an amount from one currency to another via USD pivot.
 * All rates are expressed as "1 USD = X currency units".
 */
export function convertViaUSD(
  amount: number,
  fromCode: CurrencyCode,
  toCode: CurrencyCode,
  rates: ExchangeRates,
): number {
  const fromRate = rates[fromCode];
  const toRate = rates[toCode];

  if (fromRate === undefined || toRate === undefined) {
    throw new Error(`Missing rate for ${fromRate === undefined ? fromCode : toCode}`);
  }

  return convert(amount, fromRate, toRate);
}

/**
 * Recalculate all currency inputs when one changes.
 * The changed input (baseIndex) keeps its new amount;
 * all others are recalculated from it via USD pivot.
 */
export function recalculateInputs(
  baseIndex: number,
  newAmount: number,
  currencies: Array<{ code: CurrencyCode }>,
  rates: ExchangeRates,
): number[] {
  if (currencies.length === 0) return [];

  const baseCode = currencies[baseIndex].code;
  const baseRate = rates[baseCode];

  if (baseRate === undefined) {
    throw new Error(`Missing rate for ${baseCode}`);
  }

  return currencies.map((currency, _index) => {
    if (_index === baseIndex) return newAmount;

    const targetRate = rates[currency.code];
    if (targetRate === undefined) return 0;

    return convert(newAmount, baseRate, targetRate);
  });
}
