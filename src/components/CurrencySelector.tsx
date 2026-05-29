import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  CURRENCY_CODES,
  getCurrencyMeta,
} from "@/hooks/useCurrencyStore";
import type { CurrencyCode } from "@/types";

interface CurrencySelectorProps {
  isOpen: boolean;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
  selectedCodes: CurrencyCode[];
}

export function CurrencySelector({
  isOpen,
  onSelect,
  onClose,
  selectedCodes,
}: CurrencySelectorProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      // Small delay for animation
      const timer = setTimeout(() => searchRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Keyboard trap — Tab cycles within modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

  const selectedSet = useMemo(
    () => new Set(selectedCodes),
    [selectedCodes],
  );

  const filteredCurrencies = useMemo(() => {
    const q = query.toLowerCase().trim();
    return CURRENCY_CODES.filter((code) => {
      const meta = getCurrencyMeta(code);
      const matchesQuery =
        q === "" ||
        code.toLowerCase().includes(q) ||
        meta.name.toLowerCase().includes(q);
      return matchesQuery;
    });
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-aero-900/30 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        ref={modalRef}
        onKeyDown={handleKeyDown}
        className="
          relative w-full max-w-[380px]
          bg-surface-raised/90 backdrop-blur-md
          rounded-radius-xl
          shadow-glass-elevated
          border border-glass-border
          animate-slide-up
          overflow-hidden
        "
      >
        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            >
              <path
                d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10ZM14 14l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search currency..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="
                w-full pl-9 pr-4 py-2.5
                bg-aero-50/60
                border border-aero-200/50
                rounded-radius-md
                font-body text-sm text-text-primary
                placeholder:text-text-muted
                focus:outline-none focus:ring-2 focus:ring-aero-400/40
                transition-shadow duration-150
              "
            />
          </div>
        </div>

        {/* Currency grid */}
        <div className="max-h-[360px] overflow-y-auto p-4 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {filteredCurrencies.map((code) => {
              const meta = getCurrencyMeta(code);
              const isSelected = selectedSet.has(code);

              return (
                <button
                  key={code}
                  disabled={isSelected}
                  onClick={() => {
                    onSelect(code);
                    onClose();
                  }}
                  className={`
                    flex items-center gap-2 px-3 py-2.5
                    rounded-radius-md
                    font-body text-sm text-left
                    transition-all duration-150 cursor-pointer
                    ${
                      isSelected
                        ? "bg-aero-100/50 text-text-muted cursor-not-allowed opacity-50"
                        : "bg-aero-50/40 text-text-primary hover:bg-aero-100/60 hover:shadow-glass-inner active:scale-[0.97]"
                    }
                  `}
                >
                  <span className="text-lg leading-none">{meta.flag}</span>
                  <span className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{code}</span>
                    <span className="text-xs text-text-secondary truncate">
                      {meta.name}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {filteredCurrencies.length === 0 && (
            <p className="text-center text-text-muted text-sm py-8">
              No currencies found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
