interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h2
            className="font-display text-2xl font-semibold text-text-primary tracking-tight"
          >
            Simple Exchange
          </h2>
          <p className="font-body text-text-secondary text-sm max-w-[280px]">
            Add a currency to start converting instantly
          </p>
        </div>

        <button
          onClick={onAdd}
          className="
            relative px-8 py-3.5
            bg-aero-500 text-white
            font-display font-medium text-base
            rounded-radius-pill
            shadow-glass
            transition-all duration-200
            hover:bg-aero-400 hover:shadow-glass-elevated
            active:shadow-glass-inner active:scale-[0.97]
            cursor-pointer
          "
        >
          <span className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className="shrink-0"
            >
              <path
                d="M9 3v12M3 9h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add base currency
          </span>
        </button>
      </div>
    </div>
  );
}
