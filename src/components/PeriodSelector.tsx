interface PeriodSelectorProps {
  period: 7 | 30;
  onChange: (period: 7 | 30) => void;
}

const PERIODS = [7, 30] as const;

export function PeriodSelector({ period, onChange }: PeriodSelectorProps) {
  return (
    <div
      className="
        inline-flex gap-1
        p-1
        bg-glass-light backdrop-blur-sm
        border border-glass-border
        rounded-radius-pill
        shadow-glass-inner
      "
    >
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`
            px-3 py-1
            font-display font-semibold text-xs
            rounded-radius-pill
            transition-all duration-200
            cursor-pointer
            ${
              period === p
                ? "bg-aero-500 text-white shadow-glass-inner"
                : "text-text-secondary hover:text-text-primary hover:bg-glass-white"
            }
          `}
        >
          {p}D
        </button>
      ))}
    </div>
  );
}
