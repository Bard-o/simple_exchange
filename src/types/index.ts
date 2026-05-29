/** ISO 4217 currency codes supported by the application. */
export type CurrencyCode =
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "AUD"
  | "CAD"
  | "CHF"
  | "CNY"
  | "INR"
  | "MXN"
  | "BRL"
  | "KRW"
  | "SGD"
  | "HKD"
  | "NOK"
  | "SEK"
  | "DKK"
  | "NZD"
  | "ZAR"
  | "RUB"
  | "TRY"
  | "PLN"
  | "THB"
  | "IDR"
  | "HUF"
  | "CZK"
  | "ILS"
  | "CLP"
  | "PHP"
  | "AED"
  | "COP"
  | "SAR"
  | "MYR"
  | "RON"
  | "BGN"
  | "ARS"
  | "TWD"
  | "VND"
  | "PKR"
  | "NGN"
  | "EGP"
  | "BDT"
  | "QAR"
  | "KWD"
  | "UAH"
  | "PEN";

/** Exchange rates indexed by currency code, all relative to USD. */
export type ExchangeRates = Record<CurrencyCode, number>;

/** A single currency with its current input state. */
export interface CurrencyState {
  code: CurrencyCode;
  amount: number;
  flag: string;
}

/** A single historical rate data point. */
export interface HistoricalRate {
  date: string; // YYYY-MM-DD
  rate: number;
}

/** The four UI states the app can be in. */
export type AppView = "empty" | "selecting" | "single" | "multi";

/** Metadata returned by the currency API. */
export interface RatesMeta {
  last_updated_at: string;
}

/** Normalized response from /api/latest. */
export interface LatestRatesResponse {
  base: "USD";
  rates: ExchangeRates;
  timestamp: string;
}

/** Normalized response from /api/historical. */
export interface HistoricalRatesResponse {
  date: string;
  rates: Partial<ExchangeRates>;
}

/** API error shape. */
export interface ApiError {
  error: string;
  retryAfter?: number;
}

/** Currency info for the selector list. */
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
}
