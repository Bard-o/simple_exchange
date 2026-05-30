import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

/** KV cache wrapper with metadata for stale-while-revalidate support. */
interface CachedEntry<T> {
  data: T;
  cachedAt: number; // Unix ms
}

/** Get cached data from KV. Returns null if missing. */
export async function getCached<T>(key: string): Promise<T | null> {
  const entry = await redis.get<CachedEntry<T>>(key);
  return entry?.data ?? null;
}

/** Get cached entry with metadata (for stale detection). */
export async function getCachedEntry<T>(
  key: string,
): Promise<CachedEntry<T> | null> {
  return redis.get<CachedEntry<T>>(key);
}

/** Store data in KV with a hard TTL (seconds). */
export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number,
): Promise<void> {
  const entry: CachedEntry<T> = {
    data,
    cachedAt: Date.now(),
  };
  await redis.set(key, entry, { ex: ttlSeconds });
}

/** Check if a cached entry is fresh (within soft TTL in ms). */
export function isFresh<T>(entry: CachedEntry<T> | null, softTtlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.cachedAt < softTtlMs;
}
