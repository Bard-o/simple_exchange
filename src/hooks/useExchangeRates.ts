import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLatestRates } from "@/utils/api";
import type { ExchangeRates } from "@/types";

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

interface UseExchangeRatesReturn {
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useExchangeRates(): UseExchangeRatesReturn {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // In-memory Map as secondary cache to avoid re-fetching
  // within the same component lifecycle
  const memoryCache = useRef<Map<string, ExchangeRates>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const fetchRates = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchLatestRates(controller.signal);
      const fetchedRates = response.rates;

      // Update caches
      memoryCache.current.set("latest", fetchedRates);
      setRates(fetchedRates);
      setLastUpdated(new Date());
    } catch (err) {
      // Don't set error for aborted requests
      if (err instanceof DOMException && err.name === "AbortError") return;

      const message =
        err instanceof Error ? err.message : "Failed to fetch rates";

      // Try to use memory cache on failure
      const cached = memoryCache.current.get("latest");
      if (cached) {
        setRates(cached);
        setError(`${message} (showing cached data)`);
      } else {
        setError(message);
      }
    } finally {
      if (controller === abortRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    void fetchRates();
  }, [fetchRates]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    void fetchRates();

    const interval = setInterval(() => {
      void fetchRates();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchRates]);

  return { rates, loading, error, lastUpdated, refresh };
}
