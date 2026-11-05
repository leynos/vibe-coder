/**
 * @file Deterministic `matchMedia` shim shared by the Bun and Vitest setups.
 *
 * Happy DOM does not expose `matchMedia` on `globalThis`, and jsdom's
 * implementation reports every query as unmatched but cannot be driven by the
 * display-mode tests. Installing this stub keeps component renders
 * deterministic and lets tests dispatch synthetic change events.
 */

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

/**
 * Install a deterministic `matchMedia` stub when the environment lacks one.
 *
 * The stub reports every query as unmatched and keeps both the modern
 * `addEventListener` API and the deprecated listener API working, so the
 * display-mode fallback paths stay exercisable.
 *
 * @example
 * ```ts
 * installMatchMediaStub();
 * const query = globalThis.matchMedia("(prefers-color-scheme: dark)");
 * query.dispatchEvent(new Event("change"));
 * ```
 */
export function installMatchMediaStub(): void {
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
}
