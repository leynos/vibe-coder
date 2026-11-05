/**
 * @file Storage-failure behaviour of the display-mode provider.
 *
 * The provider must keep rendering and preserve the in-memory choice when
 * browser storage rejects a read, a write, or a removal. Each case swaps
 * `globalThis.localStorage` for a stub and asserts both the resulting state
 * and the structured warning.
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { JSX } from "react";
import { act } from "react";

import { DisplayModeProvider, useDisplayMode } from "../src/app/providers/display-mode-provider";

/** Build an in-memory Storage stub, overriding only the methods under test. */
function createStorage(overrides: Partial<Storage> = {}): Storage {
  const base: Storage = {
    length: 0,
    clear: () => {},
    getItem: () => null,
    key: () => null,
    removeItem: () => {},
    setItem: () => {},
  };
  return { ...base, ...overrides };
}

/**
 * Run `test` with `storage` installed as `globalThis.localStorage`.
 *
 * Happy DOM exposes its storage through accessors that a spy cannot replace,
 * so the tests swap the global for a plain stub and restore it afterwards.
 */
function withStorage(storage: Storage, test: () => void): void {
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  try {
    test();
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: original,
    });
  }
}

function ModeProbe(): JSX.Element {
  const { hasUserPreference, mode, resetToSystemDefault, setFullBrowser } = useDisplayMode();

  return (
    <>
      <output aria-label="Display mode">{mode}</output>
      <output aria-label="User preference">{hasUserPreference ? "yes" : "no"}</output>
      <button type="button" onClick={() => setFullBrowser()}>
        Set full browser
      </button>
      <button type="button" onClick={() => resetToSystemDefault()}>
        Reset mode
      </button>
    </>
  );
}

function readOutput(name: RegExp): string | null {
  return screen.getByRole("status", { name }).textContent;
}

describe("DisplayModeProvider storage failures", () => {
  let warnSpy: ReturnType<typeof spyOn<Console, "warn">>;

  beforeEach(() => {
    cleanup();
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    warnSpy.mockRestore();
  });

  /** Join the formatted warning lines emitted during one test. */
  function warningText(): string {
    return warnSpy.mock.calls.map((call) => String(call[0])).join("\n");
  }

  it("falls back to the viewport default and warns when storage reads fail", () => {
    const storage = createStorage({
      getItem: () => {
        throw new Error("storage denied");
      },
    });

    withStorage(storage, () => {
      render(
        <DisplayModeProvider>
          <ModeProbe />
        </DisplayModeProvider>,
      );

      expect(readOutput(/display mode/i)).toBe("hosted");
      expect(readOutput(/user preference/i)).toBe("no");
      expect(warningText()).toContain("Failed to read stored display mode");
    });
  });

  it("keeps the in-memory choice and warns when persisting fails", () => {
    const storage = createStorage({
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });

    withStorage(storage, () => {
      render(
        <DisplayModeProvider>
          <ModeProbe />
        </DisplayModeProvider>,
      );

      act(() => {
        screen.getByRole("button", { name: /set full browser/i }).click();
      });

      expect(readOutput(/display mode/i)).toBe("full-browser");
      expect(readOutput(/user preference/i)).toBe("yes");
      expect(warningText()).toContain("Failed to persist display mode preference");
    });
  });

  it("resets in memory and warns when clearing stored state fails", () => {
    const storage = createStorage({
      getItem: () => "full-browser",
      removeItem: () => {
        throw new Error("storage denied");
      },
    });

    withStorage(storage, () => {
      render(
        <DisplayModeProvider>
          <ModeProbe />
        </DisplayModeProvider>,
      );

      expect(readOutput(/display mode/i)).toBe("full-browser");

      act(() => {
        screen.getByRole("button", { name: /reset mode/i }).click();
      });

      expect(readOutput(/display mode/i)).toBe("hosted");
      expect(readOutput(/user preference/i)).toBe("no");
      expect(warningText()).toContain("Failed to clear stored display mode");
    });
  });
});
