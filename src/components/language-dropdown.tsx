"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";

export interface GlobalLocaleOption {
  locale: string;
  localeName: string;
}

interface LanguageDropdownProps {
  value: string;
  locales: GlobalLocaleOption[];
  onChange: (nextLocale: string) => void;
  autoDetectDetectedLabel?: string | null;
}

export function LanguageDropdown({
  value,
  locales,
  onChange,
  autoDetectDetectedLabel,
}: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
    setQuery("");
  }, [open]);

  const selectedOption = useMemo(
    () => locales.find((loc) => loc.locale === value) || null,
    [locales, value]
  );

  const filteredLocales = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locales;
    return locales.filter(
      (loc) =>
        loc.localeName.toLowerCase().includes(q) ||
        loc.locale.toLowerCase().includes(q)
    );
  }, [locales, query]);

  const showAutoOption = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      "auto".includes(q) ||
      "auto-detect".includes(q) ||
      "detect".includes(q) ||
      "script".includes(q)
    );
  }, [query]);

  const triggerLabel =
    value === "auto"
      ? autoDetectDetectedLabel
        ? `Auto-Detect · ${autoDetectDetectedLabel}`
        : "Auto-Detect Language from Script"
      : selectedOption
      ? selectedOption.localeName
      : value;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select studio speech language"
        className={`w-full min-h-[44px] rounded-xl border px-3 py-2.5 text-left transition-all flex items-center justify-between gap-2.5 ${
          open
            ? "border-cyan-500 dark:border-cyan-400 bg-white dark:bg-slate-950 ring-2 ring-cyan-500/20"
            : "border-sky-200 dark:border-sky-500/30 bg-white dark:bg-slate-950/90 hover:border-sky-400 dark:hover:border-sky-400/50"
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <CountryFlag
            code={value}
            label={triggerLabel}
            className="w-6 h-4"
          />
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {triggerLabel}
          </span>
          {value !== "auto" && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
              {value}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? "rotate-180 text-cyan-600 dark:text-cyan-400" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Global language options"
          className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border border-sky-200 dark:border-indigo-500/35 bg-white dark:bg-[#0b1024] shadow-2xl shadow-slate-900/15 dark:shadow-black/70 overflow-hidden"
        >
          {/* Sticky Search Filter */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800/90 bg-slate-50/90 dark:bg-slate-950/80">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 140+ languages or countries..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear language search"
                  className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable List with Fixed Country Flags */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
            {showAutoOption && (
              <button
                type="button"
                role="option"
                aria-selected={value === "auto"}
                onClick={() => {
                  onChange("auto");
                  setOpen(false);
                }}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-colors ${
                  value === "auto"
                    ? "bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/20 dark:to-cyan-500/15 text-slate-950 dark:text-white border border-cyan-300 dark:border-cyan-400/50"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <CountryFlag code="auto" label="Auto-Detect" />
                  <span className="text-xs font-semibold truncate">
                    Auto-Detect Language from Script
                  </span>
                </span>
                {value === "auto" && (
                  <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                )}
              </button>
            )}

            {filteredLocales.length === 0 && !showAutoOption ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                No languages matched &ldquo;{query}&rdquo;
              </p>
            ) : (
              filteredLocales.map((loc) => {
                const isSelected = value === loc.locale;
                return (
                  <button
                    key={loc.locale}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(loc.locale);
                      setOpen(false);
                    }}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left flex items-center justify-between gap-2.5 transition-colors ${
                      isSelected
                        ? "bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/20 dark:to-cyan-500/15 text-slate-950 dark:text-white border border-cyan-300 dark:border-cyan-400/50"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <CountryFlag code={loc.locale} label={loc.localeName} />
                      <span className="text-xs font-medium truncate">
                        {loc.localeName}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {loc.locale}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
