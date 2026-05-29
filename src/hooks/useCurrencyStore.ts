import { useReducer, useCallback, useEffect } from "react";
import type { CurrencyCode, CurrencyState, AppView } from "@/types";

// ── Currency metadata ────────────────────────────────────────

const CURRENCY_META: Record<
  CurrencyCode,
  { name: string; symbol: string; flag: string }
> = {
  USD: { name: "US Dollar", symbol: "$", flag: "\ud83c\uddfa\ud83c\uddf8" },
  EUR: { name: "Euro", symbol: "\u20ac", flag: "\ud83c\uddea\ud83c\uddfa" },
  GBP: { name: "British Pound", symbol: "\u00a3", flag: "\ud83c\uddec\ud83c\udde7" },
  JPY: { name: "Japanese Yen", symbol: "\u00a5", flag: "\ud83c\uddef\ud83c\uddf5" },
  AUD: { name: "Australian Dollar", symbol: "A$", flag: "\ud83c\udde6\ud83c\uddfa" },
  CAD: { name: "Canadian Dollar", symbol: "C$", flag: "\ud83c\udde8\ud83c\udde6" },
  CHF: { name: "Swiss Franc", symbol: "CHF", flag: "\ud83c\udde8\ud83c\udded" },
  CNY: { name: "Chinese Yuan", symbol: "\u00a5", flag: "\ud83c\udde8\ud83c\uddf3" },
  INR: { name: "Indian Rupee", symbol: "\u20b9", flag: "\ud83c\uddee\ud83c\uddf3" },
  MXN: { name: "Mexican Peso", symbol: "Mex$", flag: "\ud83c\uddf2\ud83c\uddfd" },
  BRL: { name: "Brazilian Real", symbol: "R$", flag: "\ud83c\udde7\ud83c\uddf7" },
  KRW: { name: "South Korean Won", symbol: "\u20a9", flag: "\ud83c\uddf0\ud83c\uddf7" },
  SGD: { name: "Singapore Dollar", symbol: "S$", flag: "\ud83c\uddf8\ud83c\uddec" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$", flag: "\ud83c\udded\ud83c\uddf0" },
  NOK: { name: "Norwegian Krone", symbol: "kr", flag: "\ud83c\uddf3\ud83c\uddf4" },
  SEK: { name: "Swedish Krona", symbol: "kr", flag: "\ud83c\uddf8\ud83c\uddea" },
  DKK: { name: "Danish Krone", symbol: "kr", flag: "\ud83c\udde9\ud83c\uddf0" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$", flag: "\ud83c\uddf3\ud83c\uddff" },
  ZAR: { name: "South African Rand", symbol: "R", flag: "\ud83c\uddff\ud83c\udde6" },
  RUB: { name: "Russian Ruble", symbol: "\u20bd", flag: "\ud83c\uddf7\ud83c\uddfa" },
  TRY: { name: "Turkish Lira", symbol: "\u20ba", flag: "\ud83c\uddf9\ud83c\uddf7" },
  PLN: { name: "Polish Zloty", symbol: "z\u0142", flag: "\ud83c\uddf5\ud83c\uddf1" },
  THB: { name: "Thai Baht", symbol: "\u0e3f", flag: "\ud83c\uddf9\ud83c\udded" },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp", flag: "\ud83c\uddee\ud83c\udde9" },
  HUF: { name: "Hungarian Forint", symbol: "Ft", flag: "\ud83c\udded\ud83c\uddf0" },
  CZK: { name: "Czech Koruna", symbol: "K\u010d", flag: "\ud83c\udde8\ud83c\uddff" },
  ILS: { name: "Israeli Shekel", symbol: "\u20aa", flag: "\ud83c\uddee\ud83c\uddf1" },
  CLP: { name: "Chilean Peso", symbol: "CLP$", flag: "\ud83c\udde8\ud83c\uddf1" },
  PHP: { name: "Philippine Peso", symbol: "\u20b1", flag: "\ud83c\uddf5\ud83c\udded" },
  AED: { name: "UAE Dirham", symbol: "AED", flag: "\ud83c\udde6\ud83c\uddea" },
  COP: { name: "Colombian Peso", symbol: "COL$", flag: "\ud83c\udde8\ud83c\uddf4" },
  SAR: { name: "Saudi Riyal", symbol: "\u0631.\u0633", flag: "\ud83c\uddf8\ud83c\udde6" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM", flag: "\ud83c\uddf2\ud83c\uddfe" },
  RON: { name: "Romanian Leu", symbol: "lei", flag: "\ud83c\uddf7\ud83c\uddf4" },
  BGN: { name: "Bulgarian Lev", symbol: "\u043b\u0432", flag: "\ud83c\udde7\ud83c\uddec" },
  ARS: { name: "Argentine Peso", symbol: "AR$", flag: "\ud83c\udde6\ud83c\uddf7" },
  TWD: { name: "Taiwan Dollar", symbol: "NT$", flag: "\ud83c\uddf9\ud83c\uddfc" },
  VND: { name: "Vietnamese Dong", symbol: "\u20ab", flag: "\ud83c\uddfb\ud83c\uddf3" },
  PKR: { name: "Pakistani Rupee", symbol: "Rs", flag: "\ud83c\uddf5\ud83c\uddf0" },
  NGN: { name: "Nigerian Naira", symbol: "\u20a6", flag: "\ud83c\uddf3\ud83c\uddec" },
  EGP: { name: "Egyptian Pound", symbol: "E\u00a3", flag: "\ud83c\uddea\ud83c\uddec" },
  BDT: { name: "Bangladeshi Taka", symbol: "\u09f3", flag: "\ud83c\udde7\ud83c\udde9" },
  QAR: { name: "Qatari Riyal", symbol: "QR", flag: "\ud83c\uddf6\ud83c\udde6" },
  KWD: { name: "Kuwaiti Dinar", symbol: "KD", flag: "\ud83c\uddf0\ud83c\uddfc" },
  UAH: { name: "Ukrainian Hryvnia", symbol: "\u20b4", flag: "\ud83c\uddfa\ud83c\udde6" },
  PEN: { name: "Peruvian Sol", symbol: "S/.", flag: "\ud83c\uddf5\ud83c\uddea" },
};

/** Get metadata for a currency code. */
export function getCurrencyMeta(code: CurrencyCode) {
  return CURRENCY_META[code];
}

/** All available currency codes (common ones first). */
export const CURRENCY_CODES: CurrencyCode[] = [
  "USD", "EUR", "COP", "GBP", "JPY", "BRL", "MXN", "ARS", "CAD", "AUD",
  "CHF", "CNY", "INR", "KRW", "SGD", "HKD", "NOK", "SEK", "DKK", "NZD",
  "ZAR", "RUB", "TRY", "PLN", "THB", "IDR", "HUF", "CZK", "ILS", "CLP",
  "PHP", "AED", "SAR", "MYR", "RON", "BGN", "TWD", "VND", "PKR", "NGN",
  "EGP", "BDT", "QAR", "KWD", "UAH", "PEN",
];

// ── Persistence ──────────────────────────────────────────────

const STORAGE_VERSION = "v1";
const STORAGE_KEY = `${STORAGE_VERSION}:simple-exchange:currencies`;

interface PersistedState {
  currencies: CurrencyState[];
  baseAmount: string;
}

function loadPersisted(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.currencies)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistState(currencies: CurrencyState[], baseAmount: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ currencies, baseAmount }));
  } catch {
    // localStorage full or unavailable
  }
}

// ── State shape ──────────────────────────────────────────────

interface StoreState {
  currencies: CurrencyState[];
  view: AppView;
  baseAmount: string;
}

// ── Actions ──────────────────────────────────────────────────

type Action =
  | { type: "ADD_CURRENCY"; code: CurrencyCode }
  | { type: "REMOVE_CURRENCY"; index: number }
  | { type: "SET_AMOUNT"; index: number; value: string }
  | { type: "SET_BASE_CURRENCY"; index: number }
  | { type: "OPEN_SELECTOR" }
  | { type: "CLOSE_SELECTOR" }
  | { type: "CHANGE_CURRENCY"; index: number; code: CurrencyCode };

const MAX_CURRENCIES = 4;

function deriveView(currencies: CurrencyState[], isSelecting: boolean): AppView {
  if (isSelecting) return "selecting";
  if (currencies.length === 0) return "empty";
  if (currencies.length === 1) return "single";
  return "multi";
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "ADD_CURRENCY": {
      if (state.currencies.length >= MAX_CURRENCIES) return state;
      const already = state.currencies.some((c) => c.code === action.code);
      if (already) return state;
      const meta = CURRENCY_META[action.code];
      const newCurrency: CurrencyState = {
        code: action.code,
        amount: 0,
        flag: meta.flag,
      };
      const currencies = [...state.currencies, newCurrency];
      return { ...state, currencies, view: deriveView(currencies, false) };
    }
    case "REMOVE_CURRENCY": {
      const currencies = state.currencies.filter((_, i) => i !== action.index);
      return { ...state, currencies, view: deriveView(currencies, false) };
    }
    case "SET_AMOUNT": {
      const currencies = state.currencies.map((c, i) =>
        i === action.index ? { ...c, amount: 0 } : c,
      );
      return { ...state, currencies, baseAmount: action.value };
    }
    case "SET_BASE_CURRENCY": {
      const baseAmount =
        state.currencies[action.index]?.amount?.toString() ?? "1";
      return { ...state, baseAmount };
    }
    case "OPEN_SELECTOR":
      return { ...state, view: "selecting" };
    case "CLOSE_SELECTOR":
      return { ...state, view: deriveView(state.currencies, false) };
    case "CHANGE_CURRENCY": {
      const already = state.currencies.some(
        (c, i) => i !== action.index && c.code === action.code,
      );
      if (already) return state;
      const meta = CURRENCY_META[action.code];
      const currencies = state.currencies.map((c, i) =>
        i === action.index
          ? { ...c, code: action.code, flag: meta.flag }
          : c,
      );
      return { ...state, currencies };
    }
    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────

function getInitialState(): StoreState {
  const persisted = loadPersisted();
  if (persisted && persisted.currencies.length > 0) {
    return {
      currencies: persisted.currencies,
      view: deriveView(persisted.currencies, false),
      baseAmount: persisted.baseAmount,
    };
  }
  return { currencies: [], view: "empty", baseAmount: "1" };
}

export function useCurrencyStore() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  // Persist on every state change
  useEffect(() => {
    persistState(state.currencies, state.baseAmount);
  }, [state.currencies, state.baseAmount]);

  const addCurrency = useCallback((code: CurrencyCode) => {
    dispatch({ type: "ADD_CURRENCY", code });
  }, []);

  const removeCurrency = useCallback((index: number) => {
    dispatch({ type: "REMOVE_CURRENCY", index });
  }, []);

  const setAmount = useCallback((index: number, value: string) => {
    dispatch({ type: "SET_AMOUNT", index, value });
  }, []);

  const setBaseCurrency = useCallback((index: number) => {
    dispatch({ type: "SET_BASE_CURRENCY", index });
  }, []);

  const openSelector = useCallback(() => {
    dispatch({ type: "OPEN_SELECTOR" });
  }, []);

  const closeSelector = useCallback(() => {
    dispatch({ type: "CLOSE_SELECTOR" });
  }, []);

  const changeCurrency = useCallback(
    (index: number, code: CurrencyCode) => {
      dispatch({ type: "CHANGE_CURRENCY", index, code });
    },
    [],
  );

  const canAdd = state.currencies.length < MAX_CURRENCIES;
  const hasMultiple = state.currencies.length >= 2;

  return {
    currencies: state.currencies,
    view: state.view,
    baseAmount: state.baseAmount,
    canAdd,
    hasMultiple,
    addCurrency,
    removeCurrency,
    setAmount,
    setBaseCurrency,
    openSelector,
    closeSelector,
    changeCurrency,
  };
}
