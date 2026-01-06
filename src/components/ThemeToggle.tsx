"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border text-foreground transition-colors shadow-sm hover:bg-hover dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/10"
        aria-label="Переключить тему"
        disabled
      >
        <Moon className="h-4 w-4" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => {
        const newTheme = isDark ? "light" : "dark";
        console.log("[ThemeToggle] Switching theme from", theme, "to", newTheme);
        setTheme(newTheme);
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border text-slate-700 transition-colors shadow-sm hover:bg-hover dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-white/10"
      aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
      title={isDark ? "Тёмная тема активна. Нажмите для переключения на светлую" : "Светлая тема активна. Нажмите для переключения на тёмную"}
    >
      {isDark ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}

