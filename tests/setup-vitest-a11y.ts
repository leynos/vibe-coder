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

expect.extend(toHaveNoViolations as unknown as Parameters<typeof expect.extend>[0]);

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => {
    const matches = false;
    const coreListeners = new Set<(event: MediaQueryListEvent) => void>();
    const eventListenerMap = new Map<
      EventListenerOrEventListenerObject,
      (event: MediaQueryListEvent) => void
    >();
    const legacyListenerMap = new Map<
      (this: MediaQueryList, ev: MediaQueryListEvent) => unknown,
      (event: MediaQueryListEvent) => void
    >();

    const toEventListener = (
      listener: EventListenerOrEventListenerObject,
    ): ((event: MediaQueryListEvent) => void) => {
      if (typeof listener === "function") {
        return listener as (event: MediaQueryListEvent) => void;
      }
      if (typeof listener.handleEvent === "function") {
        return (event) => listener.handleEvent(event);
      }
      return () => undefined;
    };

    const notify = (event: MediaQueryListEvent) => {
      for (const listener of coreListeners) {
        listener(event);
      }
    };

    const registerEventListener = (listener?: EventListenerOrEventListenerObject | null) => {
      if (!listener) return;
      const handler = toEventListener(listener);
      eventListenerMap.set(listener, handler);
      coreListeners.add(handler);
    };

    const unregisterEventListener = (listener?: EventListenerOrEventListenerObject | null) => {
      if (!listener) return;
      const handler = eventListenerMap.get(listener);
      if (handler) {
        coreListeners.delete(handler);
        eventListenerMap.delete(listener);
      }
    };

    let mediaQueryList: MediaQueryList;

    const registerLegacyListener = (
      listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
    ) => {
      if (!listener) return;
      const handler = (event: MediaQueryListEvent) => listener.call(mediaQueryList, event);
      legacyListenerMap.set(listener, handler);
      coreListeners.add(handler);
    };

    const unregisterLegacyListener = (
      listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
    ) => {
      if (!listener) return;
      const handler = legacyListenerMap.get(listener);
      if (handler) {
        coreListeners.delete(handler);
        legacyListenerMap.delete(listener);
      }
    };

    mediaQueryList = {
      media: query,
      matches,
      onchange: null,
      addEventListener: (
        _event: keyof MediaQueryListEventMap,
        listener: EventListenerOrEventListenerObject,
      ) => {
        registerEventListener(listener);
      },
      removeEventListener: (
        _event: keyof MediaQueryListEventMap,
        listener: EventListenerOrEventListenerObject,
      ) => {
        unregisterEventListener(listener);
      },
      addListener: (
        listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
      ) => {
        registerLegacyListener(listener);
      },
      removeListener: (
        listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null,
      ) => {
        unregisterLegacyListener(listener);
      },
      dispatchEvent: (_event: Event) => {
        const event = { matches, media: query, type: "change" } as MediaQueryListEvent;
        notify(event);
        if (typeof mediaQueryList.onchange === "function") {
          mediaQueryList.onchange.call(mediaQueryList, event);
        }
        return true;
      },
    } as MediaQueryList;

    return mediaQueryList;
  };
}

await setupI18nTestHarness();
