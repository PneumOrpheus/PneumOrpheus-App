"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-md border border-brand/30 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-brand/10 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      Theme
    </button>
  );
}