import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCurrencyStore } from "./useCurrencyStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useCurrencyStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("starts with empty state", () => {
    const { result } = renderHook(() => useCurrencyStore());
    expect(result.current.currencies).toEqual([]);
    expect(result.current.view).toBe("empty");
    expect(result.current.canAdd).toBe(true);
    expect(result.current.hasMultiple).toBe(false);
  });

  it("adds a currency and transitions to single view", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
    });

    expect(result.current.currencies).toHaveLength(1);
    expect(result.current.currencies[0].code).toBe("USD");
    expect(result.current.view).toBe("single");
    expect(result.current.hasMultiple).toBe(false);
  });

  it("adds a second currency and transitions to multi view", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
      result.current.addCurrency("EUR");
    });

    expect(result.current.currencies).toHaveLength(2);
    expect(result.current.view).toBe("multi");
    expect(result.current.hasMultiple).toBe(true);
  });

  it("enforces max 4 currencies", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
      result.current.addCurrency("EUR");
      result.current.addCurrency("GBP");
      result.current.addCurrency("JPY");
      result.current.addCurrency("COP"); // should be rejected
    });

    expect(result.current.currencies).toHaveLength(4);
    expect(result.current.canAdd).toBe(false);
  });

  it("prevents duplicate currency codes", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
      result.current.addCurrency("USD"); // duplicate
    });

    expect(result.current.currencies).toHaveLength(1);
  });

  it("removes a currency by index", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
      result.current.addCurrency("EUR");
    });

    act(() => {
      result.current.removeCurrency(0);
    });

    expect(result.current.currencies).toHaveLength(1);
    expect(result.current.currencies[0].code).toBe("EUR");
    expect(result.current.view).toBe("single");
  });

  it("opens and closes the selector", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.openSelector();
    });

    expect(result.current.view).toBe("selecting");

    act(() => {
      result.current.closeSelector();
    });

    expect(result.current.view).toBe("empty");
  });

  it("closes selector and returns to previous state", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
      result.current.openSelector();
    });

    expect(result.current.view).toBe("selecting");

    act(() => {
      result.current.closeSelector();
    });

    expect(result.current.view).toBe("single");
  });

  it("changes a currency code at an index", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
    });

    act(() => {
      result.current.changeCurrency(0, "EUR");
    });

    expect(result.current.currencies[0].code).toBe("EUR");
  });

  it("persists state to localStorage", () => {
    const { result } = renderHook(() => useCurrencyStore());

    act(() => {
      result.current.addCurrency("USD");
      result.current.addCurrency("EUR");
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    // Find the LAST setItem call (most recent state with both currencies)
    const savedCalls = localStorageMock.setItem.mock.calls.filter(
      (call: [string, string]) => call[0].includes("simple-exchange"),
    );
    const lastCall = savedCalls[savedCalls.length - 1];
    expect(lastCall).toBeDefined();
    const saved = JSON.parse(lastCall![1]);
    expect(saved.currencies).toHaveLength(2);
    expect(saved.currencies[0].code).toBe("USD");
  });

  it("restores state from localStorage", () => {
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({
        currencies: [
          { code: "USD", amount: 100, flag: "\ud83c\uddfa\ud83c\uddf8" },
          { code: "EUR", amount: 92, flag: "\ud83c\uddea\ud83c\uddfa" },
        ],
        baseAmount: "100",
      }),
    );

    const { result } = renderHook(() => useCurrencyStore());

    expect(result.current.currencies).toHaveLength(2);
    expect(result.current.currencies[0].code).toBe("USD");
    expect(result.current.view).toBe("multi");
  });

  it("handles corrupted localStorage data gracefully", () => {
    localStorageMock.getItem.mockReturnValueOnce("not-valid-json{{{");

    const { result } = renderHook(() => useCurrencyStore());

    expect(result.current.currencies).toEqual([]);
    expect(result.current.view).toBe("empty");
  });
});
