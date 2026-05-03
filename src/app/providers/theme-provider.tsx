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

type ThemeName = (typeof AVAILABLE_THEMES)[number];

interface ThemeContextValue {
  theme: ThemeName;
  themes: readonly ThemeName[];
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Returns `true` when executing in a browser context where the DOM is
 * available.
 *
 * @returns `true` if both `window` and `document` are defined.
 */
function canUseDOM(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Narrows `value` to {@link ThemeName} by checking membership in
 * {@link AVAILABLE_THEMES}.
 *
 * Accepts `unknown` so it can guard values read from untrusted sources
 * such as `localStorage`.
 *
 * @returns `true` when `value` is a supported theme identifier.
 */
function isSupportedTheme(value: unknown): value is ThemeName {
  return AVAILABLE_THEMES.includes(value as ThemeName);
}

/**
 * Apply a DaisyUI theme name to the `data-theme` attribute on both
 * `<html>` and `<body>`.
 *
 * Side-effect: mutates two DOM attributes. No-ops when called outside a
 * browser context.
 */
function applyTheme(theme: ThemeName): void {
  if (!canUseDOM()) return;
  document.documentElement.setAttribute("data-theme", theme);
  document.body?.setAttribute("data-theme", theme);
}

// localStorage is accessed synchronously on the single JavaScript thread.
// No explicit cross-provider locking is required.

/**
 * Migrate a legacy `vibecoder.theme` entry to `vibe-coder.theme`.
 *
 * Reads {@link LEGACY_STORAGE_KEY}, maps the value through
 * {@link THEME_MIGRATION}, and writes the result to {@link STORAGE_KEY}
 * when the mapped value passes {@link isSupportedTheme}. Removes the
 * legacy key unconditionally once migration has been attempted so it is
 * not processed again.
 *
 * This is a command — it performs writes and has no return value.
 * Call once before {@link readStoredTheme} in the provider initialiser.
 */
function migrateThemeStorage(): void {
  if (!canUseDOM()) return;
  try {
    // If the new key already holds a value, no migration is needed.
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;
    const migrated = THEME_MIGRATION[legacy] ?? legacy;
    if (isSupportedTheme(migrated)) {
      appLogger.debug("Migrating legacy theme storage key", {
        legacyKey: LEGACY_STORAGE_KEY,
        legacyValue: legacy,
        migratedValue: migrated,
      });
      window.localStorage.setItem(STORAGE_KEY, migrated);
    } else {
      appLogger.warn("Unsupported theme value discarded; falling back to default", {
        key: LEGACY_STORAGE_KEY,
        stored: legacy,
        fallback: DEFAULT_THEME,
      });
    }
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    appLogger.warn("Failed to migrate legacy theme storage", { key: LEGACY_STORAGE_KEY, error });
  }
}

/**
 * Read the active theme from {@link STORAGE_KEY}.
 *
 * Returns `null` when no theme is stored or when the stored value is not
 * a member of {@link AVAILABLE_THEMES}. Does not perform any writes —
 * call {@link migrateThemeStorage} beforehand to ensure any legacy
 * entries have been promoted.
 *
 * @returns The stored {@link ThemeName}, or `null` if none is valid.
 */
function readStoredTheme(): ThemeName | null {
  if (!canUseDOM()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      if (isSupportedTheme(stored)) return stored;
      appLogger.warn("Unsupported theme value discarded; falling back to default", {
        key: STORAGE_KEY,
        stored,
        fallback: DEFAULT_THEME,
      });
    }
    return null;
  } catch (error) {
    appLogger.warn("Failed to read stored theme", { key: STORAGE_KEY, error });
    return null;
  }
}

/**
 * Persist the active theme to {@link STORAGE_KEY}.
 *
 * Side-effect: writes to `localStorage`. Discards and logs values that
 * are not members of {@link AVAILABLE_THEMES} as a runtime
 * defence-in-depth measure, even though the TypeScript type prevents
 * unsupported values from being passed at compile time.
 */
function persistTheme(theme: ThemeName): void {
  if (!canUseDOM()) return;
  if (!isSupportedTheme(theme)) {
    appLogger.warn("Unsupported theme value discarded; falling back to default", {
      key: STORAGE_KEY,
      stored: theme,
      fallback: DEFAULT_THEME,
    });
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    appLogger.warn("Failed to persist theme preference", { key: STORAGE_KEY, theme, error });
  }
}

/**
 * Provide access to the active DaisyUI theme for the application.
 *
 * On mount, migrates any legacy `vibecoder.theme` storage entry before
 * reading the active theme, so the migration is transparent to consumers.
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
  const [theme, setThemeState] = useState<ThemeName>(() => {
    migrateThemeStorage();
    return readStoredTheme() ?? DEFAULT_THEME;
  });

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
