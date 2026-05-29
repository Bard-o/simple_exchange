import { useState, useEffect, useCallback } from "react";
import { fetchHistoricalRates } from "@/utils/api";
import { getCached, setCached, cacheHistoryKey } from "@/utils/cache";
import type { CurrencyCode, HistoricalRate } from "@/types";

interface UseHistoricalRatesReturn {
  data: HistoricalRate[];
  loading: boolean;
  error: string | null;
}

/** TTL for session cache: 15 minutes. */
const CACHE_TTL = 15 * 60 * 1000;

/**
 * Build start/end date strings for the past N days.
 * Returns [startDate, endDate] as YYYY-MM-DD strings.
 */
function getDateRange(days: number): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return [fmt(start), fmt(end)];
}

export function useHistoricalRates(
  base: CurrencyCode,
  target: CurrencyCode,
  days: 7 | 30 = 7,
): UseHistoricalRatesReturn {
  const [data, setData] = useState<HistoricalRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (base === target) {
      setData([]);
      return;
    }

    const cacheKey = `hist:${base}:${target}:${days}`;
    setLoading(true);
    setError(null);

    // Try sessionStorage cache first
    const cached = getCached<HistoricalRate[]>(cacheKey, CACHE_TTL);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    try {
      const [startDate, endDate] = getDateRange(days);
      const response = await fetchHistoricalRates(
        base,
        target,
        startDate,
        endDate,
      );

      // Transform response into HistoricalRate[]
      const points: HistoricalRate[] = Object.entries(response)
        .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .map(([date, rates]) => {
          const rate = rates[target];
          return { date, rate: rate ?? 0 };
        })
        .filter((p) => p.rate > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      // Cache each individual date as well for cross-pair reuse
      for (const point of points) {
        setCached(
          cacheHistoryKey(base, target, point.date),
          point.rate,
        );
      }

      // Cache the full result
      setCached(cacheKey, points);
      setData(points);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch historical data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [base, target, days]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return { data, loading, error };
}
