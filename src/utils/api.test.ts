import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchLatestRates,
  fetchHistoricalRates,
  triggerBackfill,
  ApiFetchError,
} from "./api";

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("ApiFetchError", () => {
  it("sets name and status from constructor", () => {
    const err = new ApiFetchError(502, { error: "bad gateway" });
    expect(err.name).toBe("ApiFetchError");
    expect(err.status).toBe(502);
    expect(err.message).toBe("bad gateway");
    expect(err.body).toEqual({ error: "bad gateway" });
  });
});

describe("fetchLatestRates", () => {
  it("fetches /api/latest and returns parsed response", async () => {
    const data = {
      base: "USD",
      rates: { EUR: 0.92, COP: 3901 },
      timestamp: "2025-01-01T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });

    const result = await fetchLatestRates();
    expect(mockFetch).toHaveBeenCalledWith("/api/latest", {
      signal: undefined,
    });
    expect(result).toEqual(data);
  });

  it("passes AbortSignal to fetch", async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          base: "USD",
          rates: {},
          timestamp: "",
        }),
    });

    await fetchLatestRates(controller.signal);
    expect(mockFetch).toHaveBeenCalledWith("/api/latest", {
      signal: controller.signal,
    });
  });

  it("throws ApiFetchError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () =>
        Promise.resolve({
          error: "upstream failure",
          retryAfter: 60,
        }),
    });

    try {
      await fetchLatestRates();
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiFetchError);
      const apiErr = err as ApiFetchError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.body).toEqual({ error: "upstream failure", retryAfter: 60 });
    }
  });
});

describe("fetchHistoricalRates", () => {
  it("fetches /api/historical with correct query params", async () => {
    const data = {
      "2025-01-01": { COP: 3901 },
      "2025-01-02": { COP: 3905 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });

    const result = await fetchHistoricalRates(
      "USD",
      "COP",
      "2025-01-01",
      "2025-01-02",
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/historical?");
    expect(calledUrl).toContain("from=USD");
    expect(calledUrl).toContain("to=COP");
    expect(calledUrl).toContain("start=2025-01-01");
    expect(calledUrl).toContain("end=2025-01-02");
    expect(result).toEqual(data);
  });

  it("passes AbortSignal to fetch", async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await fetchHistoricalRates(
      "USD",
      "COP",
      "2025-01-01",
      "2025-01-02",
      controller.signal,
    );

    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
      signal: controller.signal,
    });
  });

  it("throws ApiFetchError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "bad params" }),
    });

    await expect(
      fetchHistoricalRates("USD", "COP", "bad", "date"),
    ).rejects.toThrow(ApiFetchError);
  });
});

describe("triggerBackfill", () => {
  it("sends POST to /api/backfill with days", async () => {
    const data = { backfilled: 30, skipped: 0, errors: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });

    const result = await triggerBackfill(30);
    expect(mockFetch).toHaveBeenCalledWith("/api/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 30 }),
      signal: undefined,
    });
    expect(result).toEqual(data);
  });

  it("defaults to 30 days", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ backfilled: 0, skipped: 0, errors: [] }),
    });

    await triggerBackfill();
    const call = mockFetch.mock.calls[0];
    expect(call[1].body).toBe(JSON.stringify({ days: 30 }));
  });

  it("passes AbortSignal to fetch", async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ backfilled: 0, skipped: 0, errors: [] }),
    });

    await triggerBackfill(30, controller.signal);
    expect(mockFetch).toHaveBeenCalledWith("/api/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 30 }),
      signal: controller.signal,
    });
  });

  it("throws ApiFetchError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "server error" }),
    });

    await expect(triggerBackfill()).rejects.toThrow(ApiFetchError);
  });
});
