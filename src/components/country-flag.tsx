"use client";

import type { ComponentType, SVGAttributes } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { hasFlag } from "country-flag-icons";
import { Globe2 } from "lucide-react";

type FlagSvgComponent = ComponentType<
  SVGAttributes<SVGElement> & { title?: string }
>;

const FLAG_MAP = Flags as unknown as Record<
  string,
  FlagSvgComponent | undefined
>;

const SPECIAL_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
  UR: "PK",
  EN: "US",
  EL: "GR",
  HE: "IL",
  JA: "JP",
  KO: "KR",
  ZH: "CN",
  HI: "IN",
  BN: "BD",
  FA: "IR",
  SW: "KE",
  ZU: "ZA",
  FIL: "PH",
};

export function resolveIsoCountryCode(codeOrLocale?: string | null): string | null {
  if (!codeOrLocale) return null;
  const raw = codeOrLocale.trim();
  if (!raw || raw.toLowerCase() === "auto") return null;

  const upperWhole = raw.toUpperCase();
  if (SPECIAL_CODE_ALIASES[upperWhole]) {
    const mapped = SPECIAL_CODE_ALIASES[upperWhole];
    if (hasFlag(mapped)) return mapped;
  }
  if (/^[A-Z]{2}$/.test(upperWhole) && hasFlag(upperWhole)) {
    return upperWhole;
  }

  const parts = raw.split(/[-_]/).filter(Boolean);
  // Look from index 1 onward for a 2-letter ISO region subtag (skips 4-letter scripts like Latn/Cyrl/Hans)
  for (let i = 1; i < parts.length; i += 1) {
    const candidate = parts[i].toUpperCase();
    if (SPECIAL_CODE_ALIASES[candidate] && hasFlag(SPECIAL_CODE_ALIASES[candidate])) {
      return SPECIAL_CODE_ALIASES[candidate];
    }
    if (/^[A-Z]{2}$/.test(candidate) && hasFlag(candidate)) {
      return candidate;
    }
  }

  // Fallback to primary language subtag mapping if no region subtag exists
  const primary = (parts[0] || "").toUpperCase();
  if (SPECIAL_CODE_ALIASES[primary] && hasFlag(SPECIAL_CODE_ALIASES[primary])) {
    return SPECIAL_CODE_ALIASES[primary];
  }
  if (/^[A-Z]{2}$/.test(primary) && hasFlag(primary)) {
    return primary;
  }

  return null;
}

interface CountryFlagProps {
  code?: string | null;
  label?: string;
  variant?: "badge" | "backdrop";
  className?: string;
}

export function CountryFlag({
  code,
  label,
  variant = "badge",
  className = "",
}: CountryFlagProps) {
  const iso = resolveIsoCountryCode(code);
  const FlagSvg = iso ? FLAG_MAP[iso] : undefined;

  if (variant === "backdrop") {
    if (!FlagSvg) {
      return (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        >
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/20 via-cyan-400/15 to-violet-500/20 blur-md" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/65 to-transparent dark:from-slate-950/90 dark:via-slate-950/70 dark:to-transparent" />
        </div>
      );
    }

    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      >
        <FlagSvg
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full scale-[1.08] object-cover opacity-[0.26] dark:opacity-[0.28] saturate-[1.15]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/68 to-white/30 dark:from-slate-950/92 dark:via-slate-950/72 dark:to-slate-950/38" />
      </div>
    );
  }

  if (!FlagSvg) {
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-4 rounded-[4px] bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-xs ring-1 ring-slate-900/10 dark:ring-white/15 shrink-0 ${className}`}
        title={label || "Global"}
      >
        <Globe2 className="w-3 h-3" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-4 rounded-[4px] overflow-hidden shadow-xs ring-1 ring-slate-900/15 dark:ring-white/20 bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
      title={label || iso || undefined}
    >
      <FlagSvg
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full block"
      />
    </span>
  );
}
