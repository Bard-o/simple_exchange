// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @upstash/redis before importing the handler
vi.mock("@upstash/redis", () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
  };
  return {
    Redis: vi.fn(() => mockRedis),
  };
});

import { redis } from "../_lib/kv";
import handler from "../backfill";

function createMockReq(method: string = "POST", body?: unknown) {
  return { method, body } as any;
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
  // Stub fetch as a spy so we can assert it wasn't called
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("POST /api/backfill", () => {
  it("skips dates already in KV cache", async () => {
    // All dates cached
    vi.mocked(redis.get).mockResolvedValue({ data: { EUR: 0.92 } });

    const req = createMockReq("POST", { days: 5 });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.skipped).toBe(5);
    expect(body.backfilled).toBe(0);
    expect(body.errors).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("backfills missing dates sequentially", async () => {
    // All dates missing
    vi.mocked(redis.get).mockResolvedValue(null);

    let fetchCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        fetchCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              meta: { last_updated_at: "2025-01-01T00:00:00Z" },
              data: {
                EUR: { code: "EUR", value: 0.92 + fetchCount * 0.01 },
              },
            }),
        });
      }),
    );

    const req = createMockReq("POST", { days: 3 });
    const res = createMockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.backfilled).toBe(3);
    expect(body.skipped).toBe(0);
    expect(body.errors).toEqual([]);

    // Verify sequential: 3 API calls made
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("collects errors from failed API calls", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          json: () => Promise.resolve({}),
        }),
      ),
    );

    const req = createMockReq("POST", { days: 2 });
    const res = createMockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.backfilled).toBe(0);
    expect(body.errors.length).toBe(2);
    expect(body.errors[0]).toMatch(/^\d{4}-\d{2}-\d{2}:.*429/);
  });

  it("handles mix of cached and missing dates", async () => {
    let callCount = 0;
    vi.mocked(redis.get).mockImplementation(() => {
      callCount++;
      // First date cached, rest missing
      if (callCount === 1) {
        return Promise.resolve({ data: { EUR: 0.92 } });
      }
      return Promise.resolve(null);
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              meta: { last_updated_at: "2025-01-01T00:00:00Z" },
              data: { EUR: { code: "EUR", value: 0.93 } },
            }),
        }),
      ),
    );

    const req = createMockReq("POST", { days: 3 });
    const res = createMockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.skipped).toBe(1);
    expect(body.backfilled).toBe(2);
  });

  it("returns 400 for invalid days parameter", async () => {
    const req = createMockReq("POST", { days: 0 });
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 for days exceeding 90", async () => {
    const req = createMockReq("POST", { days: 100 });
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 405 for non-POST methods", async () => {
    const req = createMockReq("GET");
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("returns 500 when CURRENCY_API_KEY is missing", async () => {
    delete process.env.CURRENCY_API_KEY;

    const req = createMockReq("POST", { days: 5 });
    const res = createMockRes();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
