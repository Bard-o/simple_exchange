import { useState, useEffect, useCallback } from "react";
import { fetchHistoricalRates } from "@/utils/api";
import { getCached, setCached } from "@/utils/cache";
import type { HistoricalRate } from "@/types";

const CACHE_TTL = 15 * 60 * 1000;
const BASE = "USD";

function getDateRange(days: number): [string, string] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return [fmt(start), fmt(end)];
}

interface UseHistoricalDataReturn {
  /** Historical data keyed by target currency code. */
  dataByTarget: Record<string, HistoricalRate[]>;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch historical exchange rates once for ALL currencies against USD.
 * Multiple charts share the same API call — 3 charts = 1 request, not 3.
 */
export function useHistoricalData(
  days: 7 | 30,
): UseHistoricalDataReturn {
  const [dataByTarget, setDataByTarget] = useState<
    Record<string, HistoricalRate[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    const cacheKey = `hist:${BASE}:${days}`;
    setLoading(true);
    setError(null);

    // Check sessionStorage first — one cache for all targets
    const cached = getCached<Record<string, HistoricalRate[]>>(
      cacheKey,
      CACHE_TTL,
    );
    if (cached) {
      setDataByTarget(cached);
      setLoading(false);
      return;
    }

    try {
      const [startDate, endDate] = getDateRange(days);
      // Single API call returns ALL currencies for all dates
      const response = await fetchHistoricalRates(
        BASE,
        BASE,
        startDate,
        endDate,
      );
      console.log("[useHistoricalData] Raw response sample:", JSON.stringify(response[Object.keys(response)[0]]));
      console.log("[useHistoricalData] All currencies in first date:", Object.keys(response[Object.keys(response)[0]] || {}));

      console.log("[useHistoricalData] Response dates:", Object.keys(response));
      const firstDate = Object.keys(response)[0];
      console.log("[useHistoricalData] First date data:", JSON.stringify(response[firstDate]));
      
      // Pivot: { "2026-05-29": { COP: 3901, EUR: 0.92 } }
      //    → { COP: [{ date: "2026-05-29", rate: 3901 }], EUR: [...] }
      const byTarget: Record<string, HistoricalRate[]> = {};
      const sortedDates = Object.keys(response)
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();

      console.log("[useHistoricalData] Sorted valid dates:", sortedDates);
      
      for (const date of sortedDates) {
        const rates = response[date];
        if (!rates) continue;
        console.log("[useHistoricalData] Processing date:", date, "rates:", JSON.stringify(rates).slice(0, 200));
        for (const [currency, rate] of Object.entries(rates)) {
          if (rate == null || rate <= 0) continue;
          if (!byTarget[currency]) byTarget[currency] = [];
          byTarget[currency].push({ date, rate });
        }
      }
      
      console.log("[useHistoricalData] Final byTarget keys:", Object.keys(byTarget));
      console.log("[useHistoricalData] Sample EUR data:", JSON.stringify(byTarget["EUR"]));

      setCached(cacheKey, byTarget);
      setDataByTarget(byTarget);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch historical data",
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return { dataByTarget, loading, error };
}
