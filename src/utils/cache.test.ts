import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCached, setCached, cacheHistoryKey, clearCache } from "./cache";

describe("cache helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("getCached", () => {
    it("returns null for missing key", () => {
      expect(getCached("nonexistent", 60000)).toBeNull();
    });

    it("returns cached data within TTL", () => {
      setCached("test-key", { value: 42 });
      const result = getCached<{ value: number }>("test-key", 60000);
      expect(result).toEqual({ value: 42 });
    });

    it("returns null after TTL expires", () => {
      setCached("test-key", "data");

      // Advance time past TTL
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now + 120000);

      expect(getCached("test-key", 60000)).toBeNull();

      vi.restoreAllMocks();
    });

    it("removes expired key from sessionStorage", () => {
      setCached("test-key", "data");

      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now + 120000);

      getCached("test-key", 60000);

      // Key should be removed after TTL check
      expect(sessionStorage.getItem("v1:test-key")).toBeNull();

      vi.restoreAllMocks();
    });

    it("returns null for corrupted JSON data", () => {
      sessionStorage.setItem("v1:corrupted", "not-valid-json{");
      expect(getCached("corrupted", 60000)).toBeNull();
    });

    it("handles sessionStorage unavailability gracefully", () => {
      const getItemSpy = vi
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
          throw new Error("Not available");
        });

      expect(getCached("any-key", 60000)).toBeNull();

      getItemSpy.mockRestore();
    });

    it("uses versioned key prefix", () => {
      setCached("test", "value");
      expect(sessionStorage.getItem("v1:test")).not.toBeNull();
    });
  });

  describe("setCached", () => {
    it("stores data with timestamp", () => {
      setCached("test", { amount: 100 });

      const raw = sessionStorage.getItem("v1:test");
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.data).toEqual({ amount: 100 });
      expect(parsed.timestamp).toBeTypeOf("number");
    });

    it("handles sessionStorage full gracefully", () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("QuotaExceededError");
        });

      // Should not throw
      expect(() => setCached("test", "data")).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("cacheHistoryKey", () => {
    it("generates consistent key format", () => {
      const key = cacheHistoryKey("USD", "EUR", "2026-05-28");
      expect(key).toBe("history:USD:EUR:2026-05-28");
    });

    it("generates different keys for different dates", () => {
      const key1 = cacheHistoryKey("USD", "EUR", "2026-05-28");
      const key2 = cacheHistoryKey("USD", "EUR", "2026-05-27");
      expect(key1).not.toBe(key2);
    });
  });

  describe("clearCache", () => {
    it("removes all versioned cache entries", () => {
      setCached("key1", "value1");
      setCached("key2", "value2");
      sessionStorage.setItem("unrelated", "keep-me");

      clearCache();

      expect(sessionStorage.getItem("v1:key1")).toBeNull();
      expect(sessionStorage.getItem("v1:key2")).toBeNull();
      expect(sessionStorage.getItem("unrelated")).toBe("keep-me");
    });

    it("handles empty sessionStorage", () => {
      expect(() => clearCache()).not.toThrow();
    });
  });
});
