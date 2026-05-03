import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { act } from "react";

import { DisplayModeProvider, useDisplayMode } from "../src/app/providers/display-mode-provider";

type MatchListener = (event: MediaQueryListEvent) => void;
type MatchMap = Record<string, boolean>;

function createMatchMediaStub(initialMatches: MatchMap) {
  const listeners = new Map<string, Set<MatchListener>>();
  const currentMatches = new Map(Object.entries(initialMatches));
  const eventListenerMap = new WeakMap<EventListenerOrEventListenerObject, MatchListener>();
  const legacyListenerMap = new WeakMap<
    (this: MediaQueryList, ev: MediaQueryListEvent) => unknown,
    MatchListener
  >();
  const originalMatchMedia = window.matchMedia;

  const getQueryListeners = (query: string): Set<MatchListener> => {
    const existing = listeners.get(query);
    if (existing) {
      return existing;
    }
    const created = new Set<MatchListener>();
    listeners.set(query, created);
    return created;
  };

  const matchMedia = (query: string): MediaQueryList => {
    const queryListeners = getQueryListeners(query);
    let changeHandler: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;

    const mediaQueryList = {
      media: query,
      get matches() {
        return currentMatches.get(query) === true;
      },
      get onchange() {
        return changeHandler;
      },
      set onchange(handler) {
        changeHandler = handler;
      },
      addEventListener: (
        type: keyof MediaQueryListEventMap,
        listener: EventListenerOrEventListenerObject | null,
      ) => {
        if (type !== "change" || listener == null) {
          return;
        }
        const wrapped =
          eventListenerMap.get(listener) ??
          (typeof listener === "function"
            ? (listener as MatchListener)
            : (event: MediaQueryListEvent) => listener.handleEvent?.(event));
        eventListenerMap.set(listener, wrapped);
        queryListeners.add(wrapped);
      },
      removeEventListener: (
        type: keyof MediaQueryListEventMap,
        listener: EventListenerOrEventListenerObject | null,
      ) => {
        if (type !== "change" || listener == null) {
          return;
        }
        const wrapped = eventListenerMap.get(listener);
        if (wrapped) {
          queryListeners.delete(wrapped);
        }
      },
      addListener: (listener) => {
        if (listener) {
          const wrapped =
            legacyListenerMap.get(listener) ??
            ((event: MediaQueryListEvent) => listener.call(mediaQueryList, event));
          legacyListenerMap.set(listener, wrapped);
          queryListeners.add(wrapped);
        }
      },
      removeListener: (listener) => {
        if (!listener) {
          return;
        }
        const wrapped = legacyListenerMap.get(listener);
        if (wrapped) {
          queryListeners.delete(wrapped);
        }
      },
      dispatchEvent: () => true,
    } as MediaQueryList;

    return mediaQueryList;
  };

  window.matchMedia = matchMedia;

  return {
    setMatch(query: string, nextValue: boolean) {
      currentMatches.set(query, nextValue);
      const event = Object.assign(new Event("change"), {
        matches: nextValue,
        media: query,
      }) as MediaQueryListEvent;

      for (const listener of getQueryListeners(query)) {
        listener(event);
      }
    },
    restore() {
      window.matchMedia = originalMatchMedia;
      listeners.clear();
      currentMatches.clear();
    },
  };
}

function findStorageValues(): string[] {
  const values: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) {
      continue;
    }
    const value = window.localStorage.getItem(key);
    if (value) {
      values.push(value);
    }
  }

  return values;
}

function ModeProbe(): JSX.Element {
  const { hasUserPreference, mode, resetToSystemDefault, setFullBrowser, setHosted } =
    useDisplayMode();

  return (
    <>
      <output aria-label="Display mode">{mode}</output>
      <output aria-label="User preference">{hasUserPreference ? "yes" : "no"}</output>
      <button type="button" onClick={() => setFullBrowser()}>
        Set full browser
      </button>
      <button type="button" onClick={() => setHosted()}>
        Set hosted
      </button>
      <button type="button" onClick={() => resetToSystemDefault()}>
        Reset mode
      </button>
    </>
  );
}

describe("DisplayModeProvider", () => {
  let matchMediaStub: ReturnType<typeof createMatchMediaStub> | null = null;

  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    matchMediaStub = null;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    matchMediaStub?.restore();
    matchMediaStub = null;
  });

  it("defaults to full-browser mode on narrow viewports", () => {
    matchMediaStub = createMatchMediaStub({
      "(max-width: 768px)": true,
    });

    render(
      <DisplayModeProvider>
        <ModeProbe />
      </DisplayModeProvider>,
    );

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("full-browser");
    expect(screen.getByRole("status", { name: /user preference/i }).textContent).toBe("no");
  });

  it("defaults to hosted mode on desktop viewports", () => {
    matchMediaStub = createMatchMediaStub({
      "(max-width: 768px)": false,
    });

    render(
      <DisplayModeProvider>
        <ModeProbe />
      </DisplayModeProvider>,
    );

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("hosted");
    expect(screen.getByRole("status", { name: /user preference/i }).textContent).toBe("no");
  });

  it("persists manual toggles across remounts", () => {
    matchMediaStub = createMatchMediaStub({
      "(max-width: 768px)": false,
    });

    const { unmount } = render(
      <DisplayModeProvider>
        <ModeProbe />
      </DisplayModeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /set full browser/i }).click();
    });

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("full-browser");
    expect(findStorageValues()).toContain("full-browser");

    unmount();

    render(
      <DisplayModeProvider>
        <ModeProbe />
      </DisplayModeProvider>,
    );

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("full-browser");
    expect(screen.getByRole("status", { name: /user preference/i }).textContent).toBe("yes");
  });

  it("resets to system defaults and clears stored preferences", () => {
    matchMediaStub = createMatchMediaStub({
      "(max-width: 768px)": true,
    });

    render(
      <DisplayModeProvider>
        <ModeProbe />
      </DisplayModeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: /set hosted/i }).click();
    });

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("hosted");
    expect(screen.getByRole("status", { name: /user preference/i }).textContent).toBe("yes");
    expect(findStorageValues()).toContain("hosted");

    act(() => {
      screen.getByRole("button", { name: /reset mode/i }).click();
    });

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("full-browser");
    expect(screen.getByRole("status", { name: /user preference/i }).textContent).toBe("no");
    expect(findStorageValues()).not.toContain("hosted");
    expect(findStorageValues()).not.toContain("full-browser");
  });

  it("tracks viewport changes when no user preference exists", () => {
    matchMediaStub = createMatchMediaStub({
      "(max-width: 768px)": false,
    });

    render(
      <DisplayModeProvider>
        <ModeProbe />
      </DisplayModeProvider>,
    );

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("hosted");

    act(() => {
      matchMediaStub?.setMatch("(max-width: 768px)", true);
    });

    expect(screen.getByRole("status", { name: /display mode/i }).textContent).toBe("full-browser");
  });
});
