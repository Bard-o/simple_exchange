import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, handleOptions } from "./_lib/cors.js";
import { getCached, setCached } from "./_lib/kv.js";
import { fetchHistoricalFromApi } from "./_lib/currency-api.js";

const KV_KEY_PREFIX = "history:";
const HARD_TTL_S = 31 * 24 * 60 * 60; // 31 days
const MAX_CONCURRENT = 5;

/** Generate date strings from start to end (inclusive). */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const last = new Date(end);

  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/** Run promises with limited concurrency. */
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const [index, task] of tasks.entries()) {
    const p = task().then((result) => {
      results[index] = result;
    });

    executing.push(p as Promise<void>);

    if (executing.length >= limit) {
      await Promise.race(executing);
      // Remove settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const settled = await Promise.race([
          executing[i].then(
            () => true,
            () => true,
          ),
          Promise.resolve(false),
        ]);
        if (settled) executing.splice(i, 1);
      }
    }
  }

  await Promise.allSettled(executing);
  return results;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  withCors(res);

  if (req.method === "OPTIONS") {
    handleOptions(res);
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.CURRENCY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "API key not configured" });
    return;
  }

  const { start, end } = req.query;

  if (!start || !end || typeof start !== "string" || typeof end !== "string") {
    res.status(400).json({ error: "Missing required params: start, end" });
    return;
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD" });
    return;
  }

  const dates = dateRange(start, end);

  if (dates.length === 0) {
    res.status(400).json({ error: "Start date must be before or equal to end date" });
    return;
  }

  if (dates.length > 365) {
    res.status(400).json({ error: "Date range cannot exceed 365 days" });
    return;
  }

  // Collect rates per date, using KV cache where available
  const result: Record<string, Record<string, number>> = {};
  const missingDates: string[] = [];

  console.log("[historical] dates requested:", dates.length);
  for (const date of dates) {
    const cached = await getCached<Record<string, number>>(
      `${KV_KEY_PREFIX}${date}`,
    );
    if (cached) {
      console.log("[historical] cache HIT for", date);
      result[date] = cached;
    } else {
      console.log("[historical] cache MISS for", date);
      missingDates.push(date);
    }
  }

  // Fetch missing dates from the API with concurrency limit
  if (missingDates.length > 0) {
    console.log("[historical] Fetching", missingDates.length, "missing dates from API");
    const tasks = missingDates.map((date) => async () => {
      try {
        console.log("[historical] Fetching date:", date);
        const rates = await fetchHistoricalFromApi(apiKey, date);
        console.log("[historical] API result for", date, ":", Object.keys(rates).slice(0, 5), "...");
        await setCached(
          `${KV_KEY_PREFIX}${date}`,
          rates,
          HARD_TTL_S,
        );
        result[date] = rates;
      } catch (err) {
        console.error("[historical] Failed to fetch", date, ":", err);
        // Individual date failure — leave it out of the response
        // The client will see gaps in the date range
      }
    });

    await parallelLimit(tasks, MAX_CONCURRENT);
  }

  console.log("[historical] Final result keys:", Object.keys(result));
  const cacheStatus = missingDates.length === 0 ? "HIT" : "MISS";
  res.setHeader("X-Cache", cacheStatus);

  // Normalize: handle legacy nested format { date, rates } stored in cache
  // by converting to flat { USD: 1, EUR: 0.85 } for consistency
  const normalizedResult: Record<string, Record<string, number>> = {};
  for (const [date, value] of Object.entries(result)) {
    if (value && typeof value === "object" && "rates" in value) {
      // Legacy nested format — unwrap it
      normalizedResult[date] = (value as unknown as { date: string; rates: Record<string, number> }).rates;
    } else {
      normalizedResult[date] = value as Record<string, number>;
    }
  }

  res.status(200).json(normalizedResult);
}
