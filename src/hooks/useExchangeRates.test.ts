import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useExchangeRates } from "./useExchangeRates";
import type { LatestRatesResponse } from "@/types";

const mockRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  COP: 4150.0,
  BRL: 4.97,
  MXN: 17.15,
  ARS: 850.0,
};

const mockResponse: LatestRatesResponse = {
  base: "USD",
  rates: mockRates as LatestRatesResponse["rates"],
  timestamp: "2026-05-29T12:00:00Z",
};

describe("useExchangeRates", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state", () => {
    vi.mocked(globalThis.fetch).mockReturnValue(
      new Promise(() => {}), // never resolves
    );

    const { result } = renderHook(() => useExchangeRates());
    expect(result.current.loading).toBe(true);
    expect(result.current.rates).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches rates and sets them", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rates).toEqual(mockRates);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it("handles fetch errors", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rates).toBeNull();
    expect(result.current.error).toBe("Network error");
  });

  it("handles API error responses", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: "Service unavailable" }),
    } as Response);

    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it("uses cached data when subsequent fetch fails", async () => {
    // First fetch succeeds
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.rates).toEqual(mockRates);
    });

    // Second fetch fails
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(
      new Error("Network error"),
    );

    // Trigger refresh
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.error).toContain("showing cached data");
    });

    // Rates should still be available from cache
    expect(result.current.rates).toEqual(mockRates);
  });

  it("refresh can be called manually", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { result } = renderHook(() => useExchangeRates());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstUpdated = result.current.lastUpdated;

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.lastUpdated).not.toBe(firstUpdated);
    });
  });
});
