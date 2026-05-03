/** @file Theme provider managing DaisyUI theme selection and persistence. */

import type { JSX, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { appLogger } from "../observability/logger";

const STORAGE_KEY = "vibe-coder.theme";
const LEGACY_STORAGE_KEY = "vibecoder.theme";
const DEFAULT_THEME = "vibe-coder-night";
const AVAILABLE_THEMES = ["vibe-coder-night", "vibe-coder-day"] as const;

const THEME_MIGRATION: Record<string, string> = {
  "vibecoder-night": "vibe-coder-night",
  "vibecoder-day": "vibe-coder-day",
};

type ThemeName = string;

interface ThemeContextValue {
  theme: ThemeName;
  themes: readonly ThemeName[];
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function canUseDOM(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isSupportedTheme(value: string): value is (typeof AVAILABLE_THEMES)[number] {
  return (AVAILABLE_THEMES as ReadonlyArray<string>).includes(value);
}

function applyTheme(theme: ThemeName) {
  if (!canUseDOM()) return;
  const next = theme || DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", next);
  document.body?.setAttribute("data-theme", next);
}

// localStorage is accessed synchronously on the single JavaScript thread.
// No explicit cross-provider locking is required.
function readStoredTheme(): ThemeName | null {
  if (!canUseDOM()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSupportedTheme(stored)) return stored;
    // One-time migration from the legacy "vibecoder.*" key.
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = THEME_MIGRATION[legacy] ?? legacy;
      if (isSupportedTheme(migrated)) {
        window.localStorage.setItem(STORAGE_KEY, migrated);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migrated;
      }
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return null;
  } catch (error) {
    appLogger.warn("Failed to read stored theme", { key: STORAGE_KEY, error });
    return null;
  }
}

function persistTheme(theme: ThemeName) {
  if (!canUseDOM()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    appLogger.warn("Failed to persist theme preference", { key: STORAGE_KEY, theme, error });
  }
}

/**
 * Provide access to the active DaisyUI theme for the application.
 *
 * @example
 * ```tsx
 * import { ThemeProvider, useTheme } from "./providers/theme-provider";
 *
 * function ThemeToggle() {
 *   const { theme, setTheme } = useTheme();
 *   return (
 *     <button onClick={() => setTheme(theme === "vibe-coder-night" ? "vibe-coder-day" : "vibe-coder-night")}>
 *       Switch theme
 *     </button>
 *   );
 * }
 *
 * export function App() {
 *   return (
 *     <ThemeProvider>
 *       <ThemeToggle />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<ThemeName>(() => readStoredTheme() ?? DEFAULT_THEME);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themes: AVAILABLE_THEMES,
      setTheme: setThemeState,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Read the current theme context.
 *
 * @throws Error when invoked outside a {@link ThemeProvider}.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
