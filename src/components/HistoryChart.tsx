import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useHistoricalRates } from "@/hooks/useHistoricalRates";
import { PeriodSelector } from "@/components/PeriodSelector";
import type { CurrencyCode } from "@/types";

interface HistoryChartProps {
  base: CurrencyCode;
  target: CurrencyCode;
}

/** Format a YYYY-MM-DD date string as short month+day (e.g. "May 29"). */
function formatShortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Custom tooltip with 2000s desktop software bevel aesthetic. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div
      className="
        px-3 py-2
        bg-surface-raised
        border border-glass-border
        rounded-radius-md
        shadow-glass
      "
      style={{
        /* Beveled inner highlight — 2000s desktop software feel */
        boxShadow: `
          inset 0 1px 0 oklch(1 0 0 / 0.4),
          inset 0 -1px 0 oklch(0 0 0 / 0.08),
          0 4px 16px oklch(0.55 0.22 12 / 0.15),
          0 1px 4px oklch(0 0 0 / 0.06)
        `,
        background:
          "linear-gradient(180deg, oklch(1 0 0 / 0.95) 0%, oklch(0.98 0.005 30 / 0.95) 100%)",
      }}
    >
      <p className="font-body text-xs text-text-secondary mb-0.5">
        {formatShortDate(label)}
      </p>
      <p className="font-mono text-sm font-semibold text-aero-600">
        {payload[0].value.toFixed(4)}
      </p>
    </div>
  );
}

export function HistoryChart({ base, target }: HistoryChartProps) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const { data, loading, error } = useHistoricalRates(base, target, period);

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        date: point.date,
        rate: point.rate,
      })),
    [data],
  );

  // Compute nice Y-axis domain with padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ["auto", "auto"];
    const rates = chartData.map((d) => d.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const padding = (max - min) * 0.1 || max * 0.05;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  return (
    <div
      className="
        px-4 pt-3 pb-4
        bg-surface-raised/70 backdrop-blur-sm
        border border-glass-border
        rounded-radius-lg
        shadow-glass-inner
        animate-slide-up
      "
    >
      {/* Header row: title + period toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm text-text-primary">
          {target} to {base}
        </h3>
        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {/* Chart area */}
      {loading && (
        <div className="h-[200px] flex items-center justify-center">
          <div
            className="w-full h-[180px] rounded-radius-md animate-pulse"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.95 0.005 30) 25%, oklch(0.92 0.01 30) 50%, oklch(0.95 0.005 30) 75%)",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      )}

      {error && !loading && (
        <div className="h-[200px] flex items-center justify-center">
          <p className="font-body text-sm text-error">
            Could not load chart data
          </p>
        </div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <div className="h-[200px] flex items-center justify-center">
          <p className="font-body text-sm text-text-muted">
            No historical data available
          </p>
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.88 0.01 30)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 10, fill: "oklch(0.60 0.01 15)" }}
              axisLine={{ stroke: "oklch(0.88 0.01 30)" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: "oklch(0.60 0.01 15)" }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="oklch(0.55 0.22 12)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: "oklch(0.55 0.22 12)",
                stroke: "white",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
