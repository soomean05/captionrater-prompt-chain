"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium opacity-50"
        disabled
      >
        Theme
      </button>
    );
  }

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
