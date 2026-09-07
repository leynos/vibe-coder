/** @file Display mode provider switching between hosted and full-browser layouts. */

import type { JSX, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { appLogger } from "../observability/logger";

const STORAGE_KEY = "vibecoder.displayMode";

/**
 * Layout mode for the shell: `"hosted"` frames content in a fixed mobile
 * viewport, `"full-browser"` fills the available browser window.
 */
export type DisplayMode = "hosted" | "full-browser";

const DESKTOP_DEFAULT_MODE: DisplayMode = "hosted";
const MOBILE_DEFAULT_MODE: DisplayMode = "full-browser";

/**
 * Display-mode state and controls published by {@link DisplayModeProvider} and
 * returned by {@link useDisplayMode}.
 */
export interface DisplayModeContextValue {
  /** Layout mode currently in force. */
  mode: DisplayMode;
  /** `true` while {@link DisplayModeContextValue.mode} is `"hosted"`. */
  isHosted: boolean;
  /** `true` while {@link DisplayModeContextValue.mode} is `"full-browser"`. */
  isFullBrowser: boolean;
  /** `true` once a mode has been chosen explicitly rather than inferred. */
  hasUserPreference: boolean;
  /** Sets the mode explicitly and records the choice as a user preference. */
  setMode: (next: DisplayMode) => void;
  /** Shorthand for `setMode("hosted")`. */
  setHosted: () => void;
  /** Shorthand for `setMode("full-browser")`. */
  setFullBrowser: () => void;
  /** Discards the stored preference and reverts to the viewport default. */
  resetToSystemDefault: () => void;
}

const DisplayModeContext = createContext<DisplayModeContextValue | undefined>(undefined);

function canUseDOM(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// localStorage is accessed synchronously on the single JavaScript thread.
// No explicit cross-provider locking is required.
function readStoredMode(): DisplayMode | null {
  if (!canUseDOM()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "hosted" || stored === "full-browser") {
      return stored;
    }
    return null;
  } catch (error) {
    appLogger.warn("Failed to read stored display mode", { key: STORAGE_KEY, error });
    return null;
  }
}

function persistMode(mode: DisplayMode) {
  if (!canUseDOM()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    appLogger.warn("Failed to persist display mode preference", { key: STORAGE_KEY, mode, error });
  }
}

function clearPersistedMode() {
  if (!canUseDOM()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Removal failures leave the stored preference in place; log for diagnostics.
    appLogger.warn("Failed to clear stored display mode", { key: STORAGE_KEY, error });
  }
}

function matchMediaQuery(query: string): boolean {
  if (!canUseDOM() || typeof window.matchMedia !== "function") {
    return false;
  }
  const result = window.matchMedia(query);
  return Boolean(result?.matches);
}

function detectPreferredDisplayMode(): DisplayMode {
  const prefersMobileViewport = matchMediaQuery("(max-width: 768px)");
  if (prefersMobileViewport) {
    return MOBILE_DEFAULT_MODE;
  }
  return DESKTOP_DEFAULT_MODE;
}

/** Props accepted by {@link DisplayModeProvider}. */
export interface DisplayModeProviderProps {
  /** Subtree that gains access to the display mode context. */
  children: ReactNode;
}

/**
 * Supplies the current {@link DisplayMode} to descendants, seeding it from
 * `localStorage` or a media-query-based default, and persisting subsequent
 * user choices back to `localStorage`.
 */
export function DisplayModeProvider({ children }: DisplayModeProviderProps): JSX.Element {
  const storedMode = readStoredMode();
  const [mode, setModeState] = useState<DisplayMode>(() => {
    if (storedMode) {
      return storedMode;
    }
    if (canUseDOM()) {
      return detectPreferredDisplayMode();
    }
    return DESKTOP_DEFAULT_MODE;
  });

  const [hasUserPreference, setHasUserPreference] = useState<boolean>(Boolean(storedMode));

  const setMode = useCallback((next: DisplayMode) => {
    setModeState(next);
    if (canUseDOM()) {
      persistMode(next);
    }
    setHasUserPreference(true);
  }, []);

  const resetToSystemDefault = useCallback(() => {
    setHasUserPreference(false);
    clearPersistedMode();
    setModeState(detectPreferredDisplayMode());
  }, []);

  useEffect(() => {
    if (!canUseDOM() || typeof window.matchMedia !== "function") {
      return;
    }
    if (hasUserPreference) {
      return;
    }

    const evaluate = () => {
      setModeState((current) => {
        if (hasUserPreference) {
          return current;
        }
        const detected = detectPreferredDisplayMode();
        return detected === current ? current : detected;
      });
    };

    const widthQuery = window.matchMedia("(max-width: 768px)");

    evaluate();

    const listeners: Array<
      [MediaQueryList, (event: MediaQueryList | MediaQueryListEvent) => void]
    > = [[widthQuery, evaluate]];

    listeners.forEach(([mediaQuery, listener]) => {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", listener);
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(listener);
      }
    });

    return () => {
      listeners.forEach(([mediaQuery, listener]) => {
        if (typeof mediaQuery.removeEventListener === "function") {
          mediaQuery.removeEventListener("change", listener);
        } else if (typeof mediaQuery.removeListener === "function") {
          mediaQuery.removeListener(listener);
        }
      });
    };
  }, [hasUserPreference]);

  const value = useMemo<DisplayModeContextValue>(() => {
    const setHosted = () => setMode("hosted");
    const setFullBrowser = () => setMode("full-browser");

    return {
      mode,
      isHosted: mode === "hosted",
      isFullBrowser: mode === "full-browser",
      hasUserPreference,
      setMode,
      setHosted,
      setFullBrowser,
      resetToSystemDefault,
    };
  }, [hasUserPreference, mode, resetToSystemDefault, setMode]);

  return <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>;
}

/**
 * Reads the {@link DisplayModeContextValue} from the nearest
 * {@link DisplayModeProvider}. Throws if called outside one.
 */
export function useDisplayMode(): DisplayModeContextValue {
  const context = useContext(DisplayModeContext);
  if (!context) {
    throw new Error("useDisplayMode must be used within a DisplayModeProvider");
  }
  return context;
}
