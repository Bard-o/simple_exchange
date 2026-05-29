import { useState, useRef, useEffect, useCallback } from "react";
import { parseAmount } from "@/utils/formatters";
import type { CurrencyCode, CurrencyState } from "@/types";

interface CurrencyInputProps {
  currency: CurrencyState;
  index: number;
  onAmountChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onChangeCurrency: (index: number) => void;
  isBase: boolean;
  canRemove: boolean;
  displayAmount: string;
  rates: Record<CurrencyCode, number> | null;
}

export function CurrencyInput({
  currency,
  index,
  onAmountChange,
  onRemove,
  onChangeCurrency,
  canRemove,
  displayAmount,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawValue, setRawValue] = useState(displayAmount);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync displayAmount when not focused
  useEffect(() => {
    if (!isFocused) {
      setRawValue(displayAmount);
    }
  }, [displayAmount, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number for editing
    const parsed = parseAmount(displayAmount);
    setRawValue(isNaN(parsed) ? "" : parsed.toString());
    // Select all for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  }, [displayAmount]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Trigger the parent update
    onAmountChange(index, rawValue);
  }, [index, onAmountChange, rawValue]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow only valid number input
      if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
        setRawValue(value);
      }
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        inputRef.current?.blur();
      }
    },
    [],
  );

  return (
    <div
      className="
        flex items-center gap-3
        px-4 py-3
        bg-surface-raised/70 backdrop-blur-sm
        border border-glass-border
        rounded-radius-lg
        shadow-glass-inner
        transition-all duration-200
        hover:shadow-glass
        animate-slide-up
      "
    >
      {/* Currency badge */}
      <button
        onClick={() => onChangeCurrency(index)}
        className="
          flex items-center gap-1.5 shrink-0
          px-3 py-1.5
          bg-aero-500 text-white
          font-display font-semibold text-sm
          rounded-radius-pill
          shadow-glass-inner
          transition-all duration-150
          hover:bg-aero-400
          active:scale-[0.95]
          cursor-pointer
        "
        title="Change currency"
      >
        <span className="text-base leading-none">{currency.flag}</span>
        <span>{currency.code}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="opacity-70"
        >
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Amount input */}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={isFocused ? rawValue : displayAmount}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="
          flex-1 min-w-0
          bg-transparent
          font-body text-lg text-text-primary
          text-right
          placeholder:text-text-muted
          focus:outline-none
        "
        placeholder="0"
      />

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={() => onRemove(index)}
          className="
            shrink-0
            w-7 h-7
            flex items-center justify-center
            text-text-muted
            rounded-radius-sm
            transition-all duration-150
            hover:bg-aero-100 hover:text-aero-600
            active:scale-[0.9]
            cursor-pointer
          "
          title="Remove currency"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M4 4l6 6M10 4l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
