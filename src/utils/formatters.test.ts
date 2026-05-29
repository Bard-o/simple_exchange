import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatRate,
  formatDate,
  parseAmount,
} from "./formatters";

describe("formatCurrency", () => {
  it("formats USD with 2 decimal places", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });

  it("formats EUR with 2 decimal places", () => {
    expect(formatCurrency(100, "EUR")).toMatch(/100\.00/);
  });

  it("formats JPY with 0 decimal places (zero-decimal currency)", () => {
    expect(formatCurrency(15000, "JPY")).toBe("¥15,000");
  });

  it("formats KRW with 0 decimal places", () => {
    expect(formatCurrency(1325000, "KRW")).toBe("₩1,325,000");
  });

  it("respects locale parameter", () => {
    // German locale uses comma as decimal separator
    const result = formatCurrency(1234.5, "EUR", "de-DE");
    expect(result).toMatch(/1.234,50/);
  });

  it("handles zero amount", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });

  it("handles negative amount", () => {
    expect(formatCurrency(-100, "USD")).toBe("-$100.00");
  });
});

describe("formatRate", () => {
  it("formats rate with 4 decimal places by default", () => {
    expect(formatRate(0.9234)).toBe("0.9234");
  });

  it("formats rate with custom decimal places", () => {
    expect(formatRate(0.9234, 2)).toBe("0.92");
  });

  it("pads with zeros when fewer decimals available", () => {
    expect(formatRate(0.5, 4)).toBe("0.5000");
  });

  it("handles very small rates", () => {
    expect(formatRate(0.0001, 6)).toBe("0.000100");
  });

  it("handles large JPY rate", () => {
    expect(formatRate(149.5, 2)).toBe("149.50");
  });
});

describe("formatDate", () => {
  it("formats ISO date string in English", () => {
    const result = formatDate("2026-05-28");
    expect(result).toBe("May 28, 2026");
  });

  it("respects locale parameter", () => {
    const result = formatDate("2026-05-28", "de-DE");
    expect(result).toMatch(/28\..*2026/);
  });

  it("handles date with time component", () => {
    const result = formatDate("2026-05-28T15:30:00Z");
    // Should still produce a valid date string
    expect(result).toBeTruthy();
  });
});

describe("parseAmount", () => {
  it("parses a plain number string", () => {
    expect(parseAmount("100")).toBe(100);
  });

  it("parses a decimal number", () => {
    expect(parseAmount("100.50")).toBe(100.5);
  });

  it("strips currency symbols", () => {
    expect(parseAmount("$1,234.56")).toBe(1234.56);
  });

  it("strips non-numeric characters", () => {
    expect(parseAmount("abc100xyz")).toBe(100);
  });

  it("returns NaN for purely non-numeric input", () => {
    expect(parseAmount("hello")).toBeNaN();
  });

  it("handles empty string", () => {
    expect(parseAmount("")).toBeNaN();
  });

  it("preserves negative sign", () => {
    expect(parseAmount("-100")).toBe(-100);
  });

  it("handles leading decimal point", () => {
    expect(parseAmount(".5")).toBe(0.5);
  });
});
