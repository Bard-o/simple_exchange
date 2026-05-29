const CACHE_VERSION = "v1";

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Retrieve a cached value from sessionStorage.
 * Returns null if key doesn't exist, TTL expired, or data is corrupted.
 */
export function getCached<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_VERSION}:${key}`);
    if (!raw) return null;

    const entry: CachedEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    if (age > ttlMs) {
      sessionStorage.removeItem(`${CACHE_VERSION}:${key}`);
      return null;
    }

    return entry.data;
  } catch {
    // Corrupted data or sessionStorage unavailable (private browsing)
    return null;
  }
}

/**
 * Store a value in sessionStorage with a timestamp for TTL support.
 */
export function setCached<T>(key: string, data: T): void {
  try {
    const entry: CachedEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(`${CACHE_VERSION}:${key}`, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — silently fail
  }
}

/**
 * Generate a consistent cache key for historical rate data.
 */
export function cacheHistoryKey(
  base: string,
  target: string,
  date: string,
): string {
  return `history:${base}:${target}:${date}`;
}

/**
 * Clear all cached entries for the current version.
 */
export function clearCache(): void {
  try {
    const prefix = `${CACHE_VERSION}:`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage unavailable
  }
}
