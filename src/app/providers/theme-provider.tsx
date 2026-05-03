/** @file Theme provider managing DaisyUI theme selection and persistence. */

import type { JSX, ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "vibecoder.theme";
const DEFAULT_THEME = "vibecoder-night";
const AVAILABLE_THEMES = ["vibecoder-night", "vibecoder-day"] as const;

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

function applyTheme(theme: ThemeName) {
  if (!canUseDOM()) return;
  const next = theme || DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", next);
  document.body?.setAttribute("data-theme", next);
}

function readStoredTheme(): ThemeName | null {
  if (!canUseDOM()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ?? null;
  } catch {
    return null;
  }
}

function persistTheme(theme: ThemeName) {
  if (!canUseDOM()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures (e.g., Safari private mode) while still applying the theme.
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
 *     <button onClick={() => setTheme(theme === "vibecoder-night" ? "vibecoder-day" : "vibecoder-night")}>
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
