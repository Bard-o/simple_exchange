import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors } from "./_lib/cors.js";
import { getCached, setCached } from "./_lib/kv.js";
import { fetchHistoricalFromApi } from "./_lib/currency-api.js";

const KV_KEY_PREFIX = "history:";
const HARD_TTL_S = 31 * 24 * 60 * 60; // 31 days

/** Generate the last N date strings (exclusive of today). */
function lastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = n; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  return dates;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  withCors(res);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const apiKey = process.env.CURRENCY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "API key not configured" });
    return;
  }

  const { days } = (req.body ?? {}) as { days?: number };
  if (!days || days < 1 || days > 90) {
    res.status(400).json({
      error: "Invalid 'days' parameter. Must be between 1 and 90.",
    });
    return;
  }

  const dates = lastNDays(days);
  let backfilled = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Sequential — rate-limited to avoid hitting currencyapi.com limits
  for (const date of dates) {
    const kvKey = `${KV_KEY_PREFIX}${date}`;
    const cached = await getCached<Record<string, number>>(kvKey);

    if (cached) {
      skipped++;
      continue;
    }

    try {
      const rates = await fetchHistoricalFromApi(apiKey, date);
      await setCached(kvKey, { date, rates }, HARD_TTL_S);
      backfilled++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${date}: ${message}`);
    }
  }

  res.status(200).json({ backfilled, skipped, errors });
}
