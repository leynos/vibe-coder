/**
 * @file Tests theme provider behaviour, storage migration, and hook usage.
 *
 * These component tests render the provider around a small probe so theme
 * state, persistence, and context contracts can be verified through the public
 * React API.
 */
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { JSX } from "react";
import { act } from "react";

import { ThemeProvider, useTheme } from "../src/app/providers/theme-provider";

function ThemeProbe(): JSX.Element {
  const { theme, themes, setTheme } = useTheme();
  const nextTheme = themes.find((entry) => entry !== theme) ?? theme;

  return (
    <>
      <output aria-label="Current theme">{theme}</output>
      <button type="button" onClick={() => setTheme(nextTheme)}>
        Switch theme
      </button>
    </>
  );
}

function findStorageKeysForValue(value: string): string[] {
  const matches: string[] = [];

  for (let index = 0; index < globalThis.localStorage.length; index += 1) {
    const key = globalThis.localStorage.key(index);
    if (key && globalThis.localStorage.getItem(key) === value) {
      matches.push(key);
    }
  }

  return matches;
}

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

describe("ThemeProvider", () => {
  beforeEach(() => {
    cleanup();
    globalThis.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.body.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
    globalThis.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.body.removeAttribute("data-theme");
  });

  it("applies the default theme to html and body", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const currentTheme = screen.getByRole("status", { name: /current theme/i }).textContent;

    expect(currentTheme.length).toBeGreaterThan(0);
    expect(document.documentElement.getAttribute("data-theme")).toBe(currentTheme);
    expect(document.body.getAttribute("data-theme")).toBe(currentTheme);
  });

  it("migrates a legacy vibecoder.theme key to vibe-coder.theme on mount", () => {
    globalThis.localStorage.setItem("vibecoder.theme", "vibecoder-night");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(globalThis.localStorage.getItem("vibe-coder.theme")).toBe("vibe-coder-night");
    expect(globalThis.localStorage.getItem("vibecoder.theme")).toBeNull();
    const displayed = screen.getByRole("status", { name: /current theme/i }).textContent;
    expect(displayed).toBe("vibe-coder-night");
  });

  it("migrates a legacy vibecoder-day theme value on mount", () => {
    globalThis.localStorage.setItem("vibecoder.theme", "vibecoder-day");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(globalThis.localStorage.getItem("vibe-coder.theme")).toBe("vibe-coder-day");
    expect(globalThis.localStorage.getItem("vibecoder.theme")).toBeNull();
    const displayed = screen.getByRole("status", { name: /current theme/i }).textContent;
    expect(displayed).toBe("vibe-coder-day");
  });

  it("falls back to the default theme when the legacy value has no mapping", () => {
    globalThis.localStorage.setItem("vibecoder.theme", "vibecoder-unknown");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const displayed = screen.getByRole("status", { name: /current theme/i }).textContent;
    expect(displayed).toBe("vibe-coder-night");
    expect(globalThis.localStorage.getItem("vibe-coder.theme")).toBe("vibe-coder-night");
    expect(globalThis.localStorage.getItem("vibecoder.theme")).toBeNull();
  });

  it("falls back to the default theme when storage holds an unsupported value", () => {
    globalThis.localStorage.setItem("vibe-coder.theme", "hax");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const displayed = screen.getByRole("status", { name: /current theme/i }).textContent;
    expect(displayed).toBe("vibe-coder-night");
    expect(globalThis.localStorage.getItem("vibe-coder.theme")).toBe("vibe-coder-night");
  });

  it("sets data-theme to a supported value for every available theme", () => {
    const availableThemes = ["vibe-coder-night", "vibe-coder-day"] as const;

    for (const themeName of availableThemes) {
      globalThis.localStorage.setItem("vibe-coder.theme", themeName);
      const { unmount } = render(
        <ThemeProvider>
          <ThemeProbe />
        </ThemeProvider>,
      );
      const attr = document.documentElement.getAttribute("data-theme") ?? "";
      expect(attr).toBe(themeName);
      const bodyAttr = document.body.getAttribute("data-theme") ?? "";
      expect(bodyAttr).toBe(themeName);
      unmount();
      cleanup();
      globalThis.localStorage.clear();
      document.documentElement.removeAttribute("data-theme");
    }
  });

  it("throws when useTheme is invoked outside ThemeProvider", () => {
    expect(() => renderHook(() => useTheme())).toThrowError(
      "useTheme must be used within a ThemeProvider",
    );
  });

  it("falls back to the default theme when storage reads fail", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const storage = createStorage({
      getItem: () => {
        throw new Error("storage denied");
      },
    });

    try {
      withStorage(storage, () => {
        render(
          <ThemeProvider>
            <ThemeProbe />
          </ThemeProvider>,
        );

        expect(screen.getByRole("status", { name: /current theme/i }).textContent).toBe(
          "vibe-coder-night",
        );
        expect(document.documentElement.getAttribute("data-theme")).toBe("vibe-coder-night");
        expect(warnSpy.mock.calls.flat().join(" ")).toContain("Failed to read stored theme");
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("keeps the in-memory theme when persistence fails", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const storage = createStorage({
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });

    try {
      withStorage(storage, () => {
        render(
          <ThemeProvider>
            <ThemeProbe />
          </ThemeProvider>,
        );

        expect(document.documentElement.getAttribute("data-theme")).toBe("vibe-coder-night");
        expect(warnSpy.mock.calls.flat().join(" ")).toContain("Failed to persist theme preference");
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("applies the document theme while the body is unavailable", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const originalBody = Object.getOwnPropertyDescriptor(document, "body");
    Object.defineProperty(document, "body", { configurable: true, value: null });

    try {
      act(() => {
        screen.getByRole("button", { name: /switch theme/i }).click();
      });
    } finally {
      if (originalBody) {
        Object.defineProperty(document, "body", originalBody);
      } else {
        Reflect.deleteProperty(document, "body");
      }
    }

    const updatedTheme = screen.getByRole("status", { name: /current theme/i }).textContent;
    expect(document.documentElement.getAttribute("data-theme")).toBe(updatedTheme);
  });

  it("warns with stable fields when the document has no root element", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const originalRoot = Object.getOwnPropertyDescriptor(document, "documentElement");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    Object.defineProperty(document, "documentElement", { configurable: true, value: null });

    try {
      act(() => {
        screen.getByRole("button", { name: /switch theme/i }).click();
      });
    } finally {
      if (originalRoot) {
        Object.defineProperty(document, "documentElement", originalRoot);
      } else {
        Reflect.deleteProperty(document, "documentElement");
      }
    }

    // The fallback is invisible to users, so diagnostics must carry stable
    // fields an operator can search for.
    const logged = warnSpy.mock.calls.flat().map(String).join(" ");
    expect(logged).toContain("Cannot apply theme");
    expect(logged).toContain('"operation":"theme.apply"');
    expect(logged).toContain('"reason":"missing-document-element"');
    warnSpy.mockRestore();
  });

  it("persists and reapplies a new theme", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const initialTheme = screen.getByRole("status", { name: /current theme/i }).textContent;

    act(() => {
      screen.getByRole("button", { name: /switch theme/i }).click();
    });

    const updatedTheme = screen.getByRole("status", { name: /current theme/i }).textContent;

    expect(updatedTheme).not.toBe(initialTheme);
    expect(document.documentElement.getAttribute("data-theme")).toBe(updatedTheme);
    expect(findStorageKeysForValue(updatedTheme)).toHaveLength(1);
  });
});
