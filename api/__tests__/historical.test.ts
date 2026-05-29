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
import handler from "../historical";

function createMockReq(
  method: string = "GET",
  query: Record<string, string> = {},
) {
  return { method, query } as any;
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
  process.env = { ...ORIGINAL_ENV, CURRENCY_API_KEY: "test-key" };
  vi.mocked(redis.get).mockReset();
  vi.mocked(redis.set).mockReset();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("GET /api/historical", () => {
  it("returns cached rates for each date in range", async () => {
    // Mock KV to return data for both dates
    vi.mocked(redis.get)
      .mockResolvedValueOnce({ data: { EUR: 0.92, COP: 3901 } }) // history:2025-01-01
      .mockResolvedValueOnce({ data: { EUR: 0.93, COP: 3910 } }); // history:2025-01-02

    const req = createMockReq("GET", {
      start: "2025-01-01",
      end: "2025-01-02",
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("X-Cache", "HIT");
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body["2025-01-01"]).toEqual({ EUR: 0.92, COP: 3901 });
    expect(body["2025-01-02"]).toEqual({ EUR: 0.93, COP: 3910 });
  });

  it("fetches missing dates from the API", async () => {
    // First date cached, second date missing
    vi.mocked(redis.get)
      .mockResolvedValueOnce({ data: { EUR: 0.92 } }) // 2025-01-01 cached
      .mockResolvedValueOnce(null); // 2025-01-02 missing

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              meta: { last_updated_at: "2025-01-02T00:00:00Z" },
              data: {
                EUR: { code: "EUR", value: 0.93 },
                COP: { code: "COP", value: 3910 },
              },
            }),
        }),
      ),
    );

    const req = createMockReq("GET", {
      start: "2025-01-01",
      end: "2025-01-02",
    });
    const res = createMockRes();

    await handler(req, res);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith("X-Cache", "MISS");

    // Missing date should be in the response
    const body = res.json.mock.calls[0][0];
    expect(body["2025-01-02"]).toEqual({ EUR: 0.93, COP: 3910 });
  });

  it("stores fetched rates in KV with 31-day TTL", async () => {
    vi.mocked(redis.get).mockResolvedValue(null); // All missing

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              meta: { last_updated_at: "2025-01-01T00:00:00Z" },
              data: { EUR: { code: "EUR", value: 0.92 } },
            }),
        }),
      ),
    );

    const req = createMockReq("GET", {
      start: "2025-01-01",
      end: "2025-01-01",
    });
    const res = createMockRes();

    await handler(req, res);

    expect(redis.set).toHaveBeenCalledWith(
      "history:2025-01-01",
      expect.any(Object),
      { ex: 31 * 24 * 60 * 60 },
    );
  });

  it("gracefully handles individual API failures", async () => {
    vi.mocked(redis.get).mockResolvedValue(null); // All missing

    // First call succeeds, second fails
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              meta: { last_updated_at: "2025-01-01T00:00:00Z" },
              data: { EUR: { code: "EUR", value: 0.92 } },
            }),
        })
        .mockRejectedValueOnce(new Error("API down")),
    );

    const req = createMockReq("GET", {
      start: "2025-01-01",
      end: "2025-01-02",
    });
    const res = createMockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body["2025-01-01"]).toEqual({ EUR: 0.92 });
    expect(body["2025-01-02"]).toBeUndefined(); // Gap in data
  });

  it("returns 400 for missing params", async () => {
    const req = createMockReq("GET", {});
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for invalid date format", async () => {
    const req = createMockReq("GET", {
      start: "not-a-date",
      end: "2025-01-02",
    });
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for date range exceeding 365 days", async () => {
    const req = createMockReq("GET", {
      start: "2023-01-01",
      end: "2025-01-01",
    });
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 405 for non-GET methods", async () => {
    const req = createMockReq("POST", {});
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("returns 500 when CURRENCY_API_KEY is missing", async () => {
    delete process.env.CURRENCY_API_KEY;

    const req = createMockReq("GET", {
      start: "2025-01-01",
      end: "2025-01-02",
    });
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
