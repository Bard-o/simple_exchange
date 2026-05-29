import type {
  ApiError,
  BackfillResponse,
  HistoricalRangeResponse,
  LatestRatesResponse,
} from "@/types";

/** Custom error class for API responses. */
export class ApiFetchError extends Error {
  status: number;
  body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.error);
    this.name = "ApiFetchError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Fetch latest exchange rates from the serverless proxy.
 * Returns normalized rates relative to USD.
 */
export async function fetchLatestRates(
  signal?: AbortSignal,
): Promise<LatestRatesResponse> {
  const response = await fetch("/api/latest", { signal });
  const data = await response.json();

  if (!response.ok) {
    throw new ApiFetchError(response.status, data as ApiError);
  }

  return data as LatestRatesResponse;
}

/**
 * Fetch historical exchange rates for a date range.
 * Returns rates per date, keyed by YYYY-MM-DD.
 */
export async function fetchHistoricalRates(
  from: string,
  to: string,
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<HistoricalRangeResponse> {
  const params = new URLSearchParams({
    from,
    to,
    start: startDate,
    end: endDate,
  });

  const response = await fetch(`/api/historical?${params}`, { signal });
  const data = await response.json();

  if (!response.ok) {
    throw new ApiFetchError(response.status, data as ApiError);
  }

  return data as HistoricalRangeResponse;
}

/**
 * Trigger a one-time backfill of historical rates.
 * This is a maintenance endpoint — not called during normal app usage.
 */
export async function triggerBackfill(
  days: number = 30,
  signal?: AbortSignal,
): Promise<BackfillResponse> {
  const response = await fetch("/api/backfill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
    signal,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new ApiFetchError(response.status, data as ApiError);
  }

  return data as BackfillResponse;
}
