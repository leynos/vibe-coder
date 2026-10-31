import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/dom";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";
import { afterEach, expect } from "vitest";

import { setupI18nTestHarness } from "./support/i18n-test-runtime";

// Ensure Testing Library surfaces hidden elements so aria-* expectations work.
configure({
  defaultHidden: true,
});

afterEach(() => {
  cleanup();
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface JestAssertion<T = unknown> {
      toHaveNoViolations(): T;
    }
  }
}

declare global {
  interface CustomMatchers<R = unknown> {
    toHaveNoViolations(): R;
  }
}

// SAFETY: Vitest widens matcher inputs to `unknown`; the jest-axe matcher is
// only invoked with the axe results produced by `axe(...)` in tests.
expect.extend(toHaveNoViolations as Parameters<typeof expect.extend>[0]);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type LegacyMediaQueryListener = (this: MediaQueryList, ev: MediaQueryListEvent) => void;

/** Adapt either modern or legacy listener shapes to a single handler. */
const toEventListener = (
  listener: EventListenerOrEventListenerObject,
): ((event: MediaQueryListEvent) => void) => {
  if ("handleEvent" in listener) {
    return (event) => listener.handleEvent(event);
  }
  return listener;
};

/** Install a deterministic `matchMedia` stub when the environment lacks one. */
const installMatchMediaStub = (): void => {
  if ("matchMedia" in globalThis) {
    return;
  }

  globalThis.matchMedia = (query: string): MediaQueryList => {
    const matches = false;
    const coreListeners = new Set<(event: MediaQueryListEvent) => void>();
    const eventListenerMap = new Map<
      EventListenerOrEventListenerObject,
      (event: MediaQueryListEvent) => void
    >();
    const legacyListenerMap = new Map<
      LegacyMediaQueryListener,
      (event: MediaQueryListEvent) => void
    >();

    const notify = (event: MediaQueryListEvent): void => {
      for (const listener of coreListeners) {
        listener(event);
      }
    };

    const registerEventListener = (listener?: EventListenerOrEventListenerObject | null): void => {
      if (!listener) return;
      const handler = toEventListener(listener);
      eventListenerMap.set(listener, handler);
      coreListeners.add(handler);
    };

    const unregisterEventListener = (
      listener?: EventListenerOrEventListenerObject | null,
    ): void => {
      if (!listener) return;
      const handler = eventListenerMap.get(listener);
      if (handler) {
        coreListeners.delete(handler);
        eventListenerMap.delete(listener);
      }
    };

    const registerLegacyListener = (listener: LegacyMediaQueryListener | null): void => {
      if (!listener) return;
      const handler = (event: MediaQueryListEvent) => listener.call(mediaQueryList, event);
      legacyListenerMap.set(listener, handler);
      coreListeners.add(handler);
    };

    const unregisterLegacyListener = (listener: LegacyMediaQueryListener | null): void => {
      if (!listener) return;
      const handler = legacyListenerMap.get(listener);
      if (handler) {
        coreListeners.delete(handler);
        legacyListenerMap.delete(listener);
      }
    };

    const mediaQueryList: MediaQueryList = {
      media: query,
      matches,
      onchange: null,
      addEventListener: (
        _event: keyof MediaQueryListEventMap,
        listener: EventListenerOrEventListenerObject,
      ): void => {
        registerEventListener(listener);
      },
      removeEventListener: (
        _event: keyof MediaQueryListEventMap,
        listener: EventListenerOrEventListenerObject,
      ): void => {
        unregisterEventListener(listener);
      },
      // The deprecated listener API remains part of the MediaQueryList contract
      // and is exercised by the display-mode fallback tests.
      // oxlint-disable-next-line typescript/no-deprecated -- legacy MediaQueryList API
      addListener: (listener: LegacyMediaQueryListener | null): void => {
        registerLegacyListener(listener);
      },
      // oxlint-disable-next-line typescript/no-deprecated -- legacy MediaQueryList API
      removeListener: (listener: LegacyMediaQueryListener | null): void => {
        unregisterLegacyListener(listener);
      },
      dispatchEvent: (_event: Event): boolean => {
        // SAFETY: `notify` and `onchange` only read `matches`, `media`, and
        // `type`, which this partial event object supplies.
        const event = { matches, media: query, type: "change" } as MediaQueryListEvent;
        notify(event);
        mediaQueryList.onchange?.call(mediaQueryList, event);
        return true;
      },
    };

    return mediaQueryList;
  };
};

installMatchMediaStub();

await setupI18nTestHarness();
