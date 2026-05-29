/** Raw response shape from currencyapi.com v3. */
interface CurrencyApiRaw {
  meta: { last_updated_at: string };
  data: Record<string, { code: string; value: number }>;
}

/** Normalized rates: currency code → numeric rate relative to USD. */
type NormalizedRates = Record<string, number>;

/** Transform raw currencyapi.com response into a flat rates map. */
export function normalizeRates(raw: CurrencyApiRaw): NormalizedRates {
  const rates: NormalizedRates = {};
  for (const [code, info] of Object.entries(raw.data)) {
    rates[code] = info.value;
  }
  return rates;
}

/** Fetch latest rates from currencyapi.com. Throws on failure. */
export async function fetchLatestFromApi(
  apiKey: string,
): Promise<{ rates: NormalizedRates; updatedAt: string }> {
  const url = `https://api.currencyapi.com/v3/latest?apikey=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`currencyapi.com /latest returned ${res.status}`);
  }

  const raw = (await res.json()) as CurrencyApiRaw;
  return {
    rates: normalizeRates(raw),
    updatedAt: raw.meta.last_updated_at,
  };
}

/** Fetch historical rates for a single date from currencyapi.com. */
export async function fetchHistoricalFromApi(
  apiKey: string,
  date: string,
): Promise<NormalizedRates> {
  const url = `https://api.currencyapi.com/v3/historical?apikey=${apiKey}&date=${date}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`currencyapi.com /historical (${date}) returned ${res.status}`);
  }

  const raw = (await res.json()) as CurrencyApiRaw;
  return normalizeRates(raw);
}
