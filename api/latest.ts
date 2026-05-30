import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, handleOptions } from "./_lib/cors.js";
import {
  getCachedEntry,
  setCached,
  isFresh,
} from "./_lib/kv.js";
import { fetchLatestFromApi } from "./_lib/currency-api.js";

const KV_KEY_LATEST = "rates:latest";
const KV_KEY_HISTORY_PREFIX = "history:";
const SOFT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const HARD_TTL_S = 24 * 60 * 60; // 24 hours (stale-while-revalidate window)
const HISTORY_TTL_S = 31 * 24 * 60 * 60; // 31 days

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

  // Check KV cache
  const cached = await getCachedEntry<{
    base: "USD";
    rates: Record<string, number>;
    timestamp: string;
  }>(KV_KEY_LATEST);

  if (cached && isFresh(cached, SOFT_TTL_MS)) {
    res.setHeader("X-Cache", "HIT");
    res.status(200).json(cached.data);
    return;
  }

  // Cache is stale or missing — try to refresh from API
  try {
    const { rates, updatedAt } = await fetchLatestFromApi(apiKey);
    const data = {
      base: "USD" as const,
      rates,
      timestamp: updatedAt,
    };

    // Save to KV with hard TTL
    await setCached(KV_KEY_LATEST, data, HARD_TTL_S);

    // Also write today's historical snapshot
    const today = new Date().toISOString().split("T")[0];
    await setCached(
      `${KV_KEY_HISTORY_PREFIX}${today}`,
      { date: today, rates },
      HISTORY_TTL_S,
    );

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(data);
  } catch (apiError) {
    // API failed — try to serve stale data
    if (cached) {
      res.setHeader("X-Cache", "STALE");
      res.status(200).json(cached.data);
      return;
    }

    // No cache at all — return error
    res.status(502).json({
      error: "Failed to fetch rates and no cached data available",
      retryAfter: 60,
    });
  }
}
