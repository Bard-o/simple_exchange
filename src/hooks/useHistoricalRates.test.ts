import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHistoricalRates } from "./useHistoricalRates";
import type { HistoricalRangeResponse } from "@/types";

const mockHistoryResponse: HistoricalRangeResponse = {
  "2026-05-23": { EUR: 0.91, GBP: 0.78 },
  "2026-05-24": { EUR: 0.92, GBP: 0.79 },
  "2026-05-25": { EUR: 0.915, GBP: 0.785 },
  "2026-05-26": { EUR: 0.918, GBP: 0.788 },
  "2026-05-27": { EUR: 0.922, GBP: 0.791 },
  "2026-05-28": { EUR: 0.919, GBP: 0.789 },
  "2026-05-29": { EUR: 0.92, GBP: 0.79 },
};

describe("useHistoricalRates", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches historical rates for a pair", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistoryResponse),
    } as Response);

    const { result } = renderHook(() =>
      useHistoricalRates("USD", "EUR", 7),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(7);
    expect(result.current.data[0]).toEqual({
      date: "2026-05-23",
      rate: 0.91,
    });
    expect(result.current.error).toBeNull();
  });

  it("returns empty data when base equals target", () => {
    const { result } = renderHook(() =>
      useHistoricalRates("USD", "USD", 7),
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("handles fetch errors", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const { result } = renderHook(() =>
      useHistoricalRates("USD", "EUR", 7),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.data).toEqual([]);
  });

  it("uses sessionStorage cache on second call", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistoryResponse),
    } as Response);

    // First call — should fetch
    const { result } = renderHook(() =>
      useHistoricalRates("USD", "EUR", 7),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Second call — should use cache
    const { result: result2 } = renderHook(() =>
      useHistoricalRates("USD", "EUR", 7),
    );

    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    // fetch should not have been called again
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result2.current.data).toHaveLength(7);
  });

  it("sorts data by date ascending", async () => {
    const unsorted: HistoricalRangeResponse = {
      "2026-05-29": { EUR: 0.92 },
      "2026-05-27": { EUR: 0.922 },
      "2026-05-28": { EUR: 0.919 },
    };

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(unsorted),
    } as Response);

    const { result } = renderHook(() =>
      useHistoricalRates("USD", "EUR", 7),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const dates = result.current.data.map((d) => d.date);
    expect(dates).toEqual(["2026-05-27", "2026-05-28", "2026-05-29"]);
  });
});
