import { useCallback, useMemo, useState } from "react";
import { useCurrencyStore } from "@/hooks/useCurrencyStore";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useHistoricalData } from "@/hooks/useHistoricalData";
import { recalculateInputs } from "@/utils/conversion";
import { formatCurrency, parseAmount } from "@/utils/formatters";
import { EmptyState } from "@/components/EmptyState";
import { CurrencySelector } from "@/components/CurrencySelector";
import { CurrencyInput } from "@/components/CurrencyInput";
import { HistoryChart } from "@/components/HistoryChart";
import { PeriodSelector } from "@/components/PeriodSelector";
import type { CurrencyCode } from "@/types";

export function App() {
  const store = useCurrencyStore();
  const { rates, loading, error, lastUpdated } = useExchangeRates();

  // Which input the user last edited (for bidirectional conversion)
  const [editingIndex, setEditingIndex] = useState(0);
  // The raw amount string from the last-edited input
  const [baseAmount, setBaseAmount] = useState("1");

  // Shared chart period — lifted here so all charts reflect the same range
  const [chartPeriod, setChartPeriod] = useState<7 | 30>(7);

  // Single historical fetch for ALL targets — one API call, not N
  const historical = useHistoricalData(chartPeriod);

  // Compute display amounts for each currency input
  const displayAmounts = useMemo(() => {
    if (!rates || store.currencies.length === 0) {
      return store.currencies.map(() => "0");
    }

    const parsedBase = parseAmount(baseAmount);
    if (isNaN(parsedBase) || parsedBase < 0) {
      return store.currencies.map((_, i) =>
        i === editingIndex ? baseAmount : "0",
      );
    }

    try {
      const amounts = recalculateInputs(
        editingIndex,
        parsedBase,
        store.currencies,
        rates,
      );
      return amounts.map((amount, i) => {
        if (i === editingIndex) return baseAmount;
        return formatCurrency(amount, store.currencies[i].code);
      });
    } catch {
      return store.currencies.map((_, i) =>
        i === editingIndex ? baseAmount : "0",
      );
    }
  }, [rates, store.currencies, editingIndex, baseAmount]);

  const handleSelectCurrency = useCallback(
    (code: CurrencyCode) => {
      store.addCurrency(code);
    },
    [store],
  );

  const handleAmountChange = useCallback(
    (index: number, value: string) => {
      setEditingIndex(index);
      setBaseAmount(value);
    },
    [],
  );

  const handleRemove = useCallback(
    (index: number) => {
      store.removeCurrency(index);
      // If we removed the editing index, reset to 0
      if (index === editingIndex) {
        setEditingIndex(0);
        setBaseAmount("1");
      } else if (index < editingIndex) {
        setEditingIndex((prev) => prev - 1);
      }
    },
    [store, editingIndex],
  );

  const handleChangeCurrency = useCallback(
    (_index: number) => {
      store.openSelector();
    },
    [store],
  );

  // Charts: one per non-base currency (max 3)
  const chartPairs = useMemo(() => {
    if (store.currencies.length < 2) return [];
    const base = store.currencies[0].code;
    return store.currencies.slice(1).map((c) => ({ base, target: c.code }));
  }, [store.currencies]);

  return (
    <div className="min-h-screen bg-surface font-body antialiased">
      {/* Subtle noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <main className="relative max-w-[420px] mx-auto px-5 py-8">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <h1 className="font-display text-xl font-bold text-text-primary tracking-tight">
            Simple Exchange
          </h1>
          {lastUpdated && !loading && (
            <p className="text-xs text-text-muted mt-1 font-body">
              Updated{" "}
              {lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {loading && !rates && (
            <p className="text-xs text-text-muted mt-1 font-body animate-pulse">
              Loading rates...
            </p>
          )}
          {error && !rates && (
            <p className="text-xs text-error mt-1 font-body">{error}</p>
          )}
        </header>

        {/* 4-state machine */}
        {store.view === "empty" && (
          <EmptyState onAdd={store.openSelector} />
        )}

        {(store.view === "single" || store.view === "multi") && (
          <>
            <div className="space-y-3">
              {store.currencies.map((currency, i) => (
                <CurrencyInput
                  key={currency.code}
                  currency={currency}
                  index={i}
                  onAmountChange={handleAmountChange}
                  onRemove={handleRemove}
                  onChangeCurrency={handleChangeCurrency}
                  isBase={i === 0}
                  canRemove={store.currencies.length > 1}
                  displayAmount={displayAmounts[i] ?? "0"}
                  rates={rates}
                />
              ))}

              {/* Add currency button */}
              {store.canAdd && (
                <button
                  onClick={store.openSelector}
                  className="
                    w-full py-3
                    flex items-center justify-center gap-2
                    border-2 border-dashed border-aero-200
                    rounded-radius-lg
                    font-display font-medium text-sm text-text-secondary
                    transition-all duration-200
                    hover:border-aero-400 hover:text-aero-500 hover:bg-aero-50/40
                    active:scale-[0.98]
                    cursor-pointer
                  "
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Add currency
                </button>
              )}
            </div>

            {/* Charts section — rendered when 2+ currencies */}
            {chartPairs.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="h-px bg-gradient-to-r from-transparent via-aero-200 to-transparent" />

                {/* Single period selector controls ALL charts */}
                <PeriodSelector
                  period={chartPeriod}
                  onChange={setChartPeriod}
                />

                <div className="space-y-3">
                  {chartPairs.map(({ base, target }) => (
                    <HistoryChart
                      key={`${base}-${target}`}
                      base={base}
                      target={target}
                      data={historical.dataByTarget[target] ?? []}
                      loading={historical.loading}
                      error={historical.error}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Currency Selector overlay */}
        <CurrencySelector
          isOpen={store.view === "selecting"}
          onSelect={handleSelectCurrency}
          onClose={store.closeSelector}
          selectedCodes={store.currencies.map((c) => c.code)}
        />
      </main>
    </div>
  );
}
