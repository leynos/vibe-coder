/** @file Display mode provider switching between hosted and full-browser layouts. */

import type { JSX, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { appLogger, toError } from "../observability/logger";

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

/**
 * Return whether the runtime exposes a DOM.
 *
 * The provider is safe to import during server-side rendering and in unit
 * tests that do not install a DOM; in both cases storage and media-query
 * access must be skipped rather than attempted.
 */
function canUseDOM(): boolean {
  return "window" in globalThis && "document" in globalThis;
}

/**
 * Read the persisted mode, or `null` when absent, invalid, or unreadable.
 *
 * localStorage is accessed synchronously on the single JavaScript thread, so
 * no explicit cross-provider locking is required. A storage failure is logged
 * and treated as "no stored preference" rather than propagated, because the
 * provider must still render.
 */
function readStoredMode(): DisplayMode | null {
  if (!canUseDOM()) return null;
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    if (stored === "hosted" || stored === "full-browser") {
      return stored;
    }
    return null;
  } catch (error) {
    appLogger.warn("Failed to read stored display mode", {
      key: STORAGE_KEY,
      error: toError(error),
    });
    return null;
  }
}

/**
 * Persist an explicit user choice.
 *
 * Storage failures (quota exceeded, private mode) are logged and swallowed:
 * the in-memory choice remains in force for the session.
 */
function persistMode(mode: DisplayMode) {
  if (!canUseDOM()) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    appLogger.warn("Failed to persist display mode preference", {
      key: STORAGE_KEY,
      mode,
      error: toError(error),
    });
  }
}

/**
 * Remove the persisted preference when the user resets to the viewport default.
 *
 * As with {@link persistMode}, a storage failure is logged rather than thrown
 * so the reset still takes effect in memory.
 */
function clearPersistedMode() {
  if (!canUseDOM()) return;
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Removal failures leave the stored preference in place; log for diagnostics.
    appLogger.warn("Failed to clear stored display mode", {
      key: STORAGE_KEY,
      error: toError(error),
    });
  }
}

// The missing-API warning is emitted once per page load; a provider that
// re-renders must not turn an unsupported runtime into a log flood.
let hasWarnedMissingMatchMedia = false;

/**
 * Return the runtime's media-query API, or `undefined` when it is absent.
 *
 * The DOM library declares `matchMedia` as always present, so the union
 * return type records the runtime reality that a few non-browser
 * environments provide a DOM without it.
 */
function getMediaQueryMatcher(): typeof globalThis.matchMedia | undefined {
  return globalThis.matchMedia;
}

/**
 * Return whether the runtime exposes the media-query API.
 *
 * `matchMedia` is absent in a few non-browser runtimes. Without it the
 * provider falls back to the desktop default instead of throwing during
 * render, and reports the degraded mode once.
 */
function canUseMediaQuery(): boolean {
  if (!canUseDOM()) {
    return false;
  }
  if (getMediaQueryMatcher() === undefined) {
    if (!hasWarnedMissingMatchMedia) {
      hasWarnedMissingMatchMedia = true;
      appLogger.warn("Media query support is unavailable; using the default display mode", {
        operation: "display-mode.detect",
        fallback: DESKTOP_DEFAULT_MODE,
      });
    }
    return false;
  }
  return true;
}

/**
 * Evaluate a media query, treating an unsupported runtime as "no match".
 *
 * Reporting `false` keeps the caller on the desktop default instead of
 * throwing during render.
 */
function matchMediaQuery(query: string): boolean {
  if (!canUseMediaQuery()) {
    return false;
  }
  const matcher = getMediaQueryMatcher();
  if (matcher === undefined) {
    return false;
  }
  return matcher(query).matches;
}

/**
 * Infer the layout mode from the viewport width.
 *
 * Narrow viewports get the full-browser layout; everything else, including a
 * runtime without `matchMedia`, gets the hosted default.
 */
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
    if (!canUseMediaQuery()) {
      return;
    }
    if (hasUserPreference) {
      return;
    }

    const evaluate = () => {
      setModeState((current) => {
        const detected = detectPreferredDisplayMode();
        return detected === current ? current : detected;
      });
    };

    const widthQuery = globalThis.matchMedia("(max-width: 768px)");

    evaluate();
    widthQuery.addEventListener("change", evaluate);

    return () => {
      widthQuery.removeEventListener("change", evaluate);
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
