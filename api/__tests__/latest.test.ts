// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @upstash/redis before importing the handler
vi.mock("@upstash/redis", () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
  };
  return {
    Redis: {
      fromEnv: vi.fn(() => mockRedis),
    },
  };
});

import { redis } from "../_lib/kv";

// Import handler after mocks are set up
import handler from "../latest";

// Helper to create Vercel-style request/response mocks
function createMockReq(
  method: string = "GET",
  query: Record<string, string> = {},
  body?: unknown,
) {
  return {
    method,
    query,
    body,
  } as any;
}

function createMockRes() {
  const res: any = {
    headers: {},
    statusCode: 200,
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key] = value;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      res.body = data;
      return res;
    }),
    end: vi.fn(() => res),
  };
  return res;
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, CURRENCY_API_KEY: "test-key" };
  vi.mocked(redis.get).mockReset();
  vi.mocked(redis.set).mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            meta: { last_updated_at: "2025-01-15T12:00:00Z" },
            data: {
              USD: { code: "USD", value: 1 },
              EUR: { code: "EUR", value: 0.92 },
              COP: { code: "COP", value: 3901 },
            },
          }),
      }),
    ),
  );
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("GET /api/latest", () => {
  it("returns cached data when fresh (HIT)", async () => {
    const cachedData = {
      base: "USD",
      rates: { EUR: 0.91, COP: 3890 },
      timestamp: "2025-01-15T11:50:00Z",
    };
    vi.mocked(redis.get).mockResolvedValueOnce({
      data: cachedData,
      cachedAt: Date.now() - 5 * 60 * 1000, // 5 min ago (within 30 min soft TTL)
    });

    const req = createMockReq("GET");
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith("X-Cache", "HIT");
    expect(res.json).toHaveBeenCalledWith(cachedData);
  });

  it("fetches from API when cache is stale (MISS)", async () => {
    const staleData = {
      base: "USD",
      rates: { EUR: 0.90 },
      timestamp: "2025-01-15T10:00:00Z",
    };
    vi.mocked(redis.get).mockResolvedValueOnce({
      data: staleData,
      cachedAt: Date.now() - 60 * 60 * 1000, // 1 hour ago (stale)
    });

    const req = createMockReq("GET");
    const res = createMockRes();

    await handler(req, res);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.currencyapi.com/v3/latest?apikey=test-key",
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Cache", "MISS");
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("stores fetched data in KV and writes today's historical snapshot", async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(null); // No cache

    const req = createMockReq("GET");
    const res = createMockRes();

    await handler(req, res);

    // Should have called redis.set twice: once for latest, once for today's history
    expect(redis.set).toHaveBeenCalledTimes(2);

    // First call: rates:latest
    const latestCall = vi.mocked(redis.set).mock.calls[0] as [string, any, any];
    const latestEntry = latestCall[1];
    expect(latestCall[0]).toBe("rates:latest");
    expect(latestEntry.data.base).toBe("USD");
    expect(latestEntry.data.rates).toEqual({
      USD: 1,
      EUR: 0.92,
      COP: 3901,
    });

    // Second call: history:YYYY-MM-DD (today)
    const [historyKey] = vi.mocked(redis.set).mock.calls[1];
    expect(historyKey).toMatch(/^history:\d{4}-\d{2}-\d{2}$/);
  });

  it("returns stale data when API fails (STALE)", async () => {
    const staleData = {
      base: "USD",
      rates: { EUR: 0.90 },
      timestamp: "2025-01-15T10:00:00Z",
    };
    vi.mocked(redis.get).mockResolvedValueOnce({
      data: staleData,
      cachedAt: Date.now() - 60 * 60 * 1000, // 1 hour ago
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("API down"))),
    );

    const req = createMockReq("GET");
    const res = createMockRes();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("X-Cache", "STALE");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(staleData);
  });

  it("returns 502 when API fails and no cache exists", async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("API down"))),
    );

    const req = createMockReq("GET");
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Failed to fetch"),
        retryAfter: 60,
      }),
    );
  });

  it("returns 405 for non-GET methods", async () => {
    const req = createMockReq("POST");
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("returns 500 when CURRENCY_API_KEY is missing", async () => {
    delete process.env.CURRENCY_API_KEY;

    const req = createMockReq("GET");
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handles OPTIONS preflight request", async () => {
    const req = createMockReq("OPTIONS");
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});
