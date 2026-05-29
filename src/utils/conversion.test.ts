import { describe, it, expect } from "vitest";
import { convert, convertViaUSD, recalculateInputs } from "./conversion";
import type { ExchangeRates } from "@/types";

const MOCK_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.12,
  MXN: 17.15,
  BRL: 4.97,
  KRW: 1325.0,
  SGD: 1.34,
  HKD: 7.82,
  NOK: 10.55,
  SEK: 10.42,
  DKK: 6.87,
  NZD: 1.63,
  ZAR: 18.65,
  RUB: 91.5,
  TRY: 30.25,
  PLN: 3.98,
  THB: 35.12,
  IDR: 15650.0,
  HUF: 355.0,
  CZK: 22.7,
  ILS: 3.68,
  CLP: 890.0,
  PHP: 56.1,
  AED: 3.67,
  COP: 3950.0,
  SAR: 3.75,
  MYR: 4.68,
  RON: 4.58,
  BGN: 1.8,
  ARS: 870.0,
  TWD: 31.8,
  VND: 24500.0,
  PKR: 278.0,
  NGN: 1550.0,
  EGP: 30.9,
  BDT: 110.0,
  QAR: 3.64,
  KWD: 0.31,
  UAH: 37.5,
  PEN: 3.72,
};

describe("convert", () => {
  it("converts between two rates using USD pivot math", () => {
    // 100 EUR -> GBP: 100 * (0.79 / 0.92) = 85.87
    const result = convert(100, 0.92, 0.79);
    expect(result).toBeCloseTo(85.87, 2);
  });

  it("returns same amount when rates are equal", () => {
    expect(convert(50, 1, 1)).toBe(50);
  });

  it("handles large JPY rates correctly", () => {
    // 1 USD = 149.5 JPY, convert 10 USD to JPY
    const result = convert(10, 1, 149.5);
    expect(result).toBe(1495);
  });

  it("throws when fromRate is zero", () => {
    expect(() => convert(100, 0, 0.79)).toThrow("fromRate cannot be zero");
  });

  it("handles zero amount", () => {
    expect(convert(0, 0.92, 0.79)).toBe(0);
  });

  it("handles fractional amounts", () => {
    // 0.50 EUR -> GBP
    const result = convert(0.5, 0.92, 0.79);
    expect(result).toBeCloseTo(0.43, 2);
  });
});

describe("convertViaUSD", () => {
  it("converts EUR to GBP via USD pivot", () => {
    const result = convertViaUSD(100, "EUR", "GBP", MOCK_RATES);
    expect(result).toBeCloseTo(85.87, 2);
  });

  it("converts USD to JPY directly", () => {
    const result = convertViaUSD(1, "USD", "JPY", MOCK_RATES);
    expect(result).toBeCloseTo(149.5, 1);
  });

  it("converts JPY back to USD", () => {
    const result = convertViaUSD(149.5, "JPY", "USD", MOCK_RATES);
    expect(result).toBeCloseTo(1, 2);
  });

  it("round-trips EUR -> JPY -> EUR", () => {
    const jpy = convertViaUSD(100, "EUR", "JPY", MOCK_RATES);
    const eur = convertViaUSD(jpy, "JPY", "EUR", MOCK_RATES);
    expect(eur).toBeCloseTo(100, 1);
  });

  it("throws when fromCode rate is missing", () => {
    const partialRates = { ...MOCK_RATES, EUR: undefined as unknown as number };
    expect(() => convertViaUSD(100, "EUR", "GBP", partialRates)).toThrow();
  });

  it("throws when toCode rate is missing", () => {
    const partialRates = { ...MOCK_RATES, GBP: undefined as unknown as number };
    expect(() => convertViaUSD(100, "EUR", "GBP", partialRates)).toThrow();
  });

  it("handles negative amounts (math works, UI rejects)", () => {
    // Mathematically valid; UI layer should prevent negative input
    const result = convertViaUSD(-100, "EUR", "GBP", MOCK_RATES);
    expect(result).toBeCloseTo(-85.87, 2);
  });
});

describe("recalculateInputs", () => {
  it("recalculates all inputs from a changed base", () => {
    const currencies = [
      { code: "EUR" as const },
      { code: "GBP" as const },
      { code: "JPY" as const },
    ];

    const result = recalculateInputs(0, 100, currencies, MOCK_RATES);

    expect(result[0]).toBe(100); // EUR unchanged (base)
    expect(result[1]).toBeCloseTo(85.87, 2); // EUR -> GBP
    expect(result[2]).toBeCloseTo(16250.0, 0); // EUR -> JPY
  });

  it("recalculates when GBP is the base", () => {
    const currencies = [
      { code: "EUR" as const },
      { code: "GBP" as const },
    ];

    const result = recalculateInputs(1, 50, currencies, MOCK_RATES);

    expect(result[0]).toBeCloseTo(58.23, 2); // GBP -> EUR: 50 * 0.92/0.79
    expect(result[1]).toBe(50); // GBP unchanged (base)
  });

  it("returns just the amount for a single currency", () => {
    const currencies = [{ code: "EUR" as const }];
    const result = recalculateInputs(0, 100, currencies, MOCK_RATES);
    expect(result).toEqual([100]);
  });

  it("returns empty array for no currencies", () => {
    const result = recalculateInputs(0, 100, [], MOCK_RATES);
    expect(result).toEqual([]);
  });

  it("throws when base currency rate is missing", () => {
    const currencies = [{ code: "EUR" as const }];
    const badRates = { ...MOCK_RATES, EUR: undefined as unknown as number };
    expect(() => recalculateInputs(0, 100, currencies, badRates)).toThrow();
  });
});
