"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export default function ThemeToggle({
  compact = false,
  className = "",
}: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={!isDark}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg border border-slate-200 dark:border-indigo-500/30 bg-white/90 dark:bg-slate-900/75 text-slate-700 dark:text-slate-200 hover:border-violet-400 dark:hover:border-cyan-400/60 hover:text-slate-950 dark:hover:text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${className}`}
    >
      {!mounted ? (
        <Sun className="w-4 h-4 text-amber-500 dark:text-amber-300 shrink-0" />
      ) : isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
      )}
      {!compact && (
        <span className="hidden sm:inline">
          {!mounted ? "Theme" : isDark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}
