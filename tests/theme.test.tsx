import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
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

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && window.localStorage.getItem(key) === value) {
      matches.push(key);
    }
  }

  return matches;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.body.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.body.removeAttribute("data-theme");
  });

  it("applies the default theme to html and body", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const currentTheme = screen.getByRole("status", { name: /current theme/i }).textContent ?? "";

    expect(currentTheme.length).toBeGreaterThan(0);
    expect(document.documentElement.getAttribute("data-theme")).toBe(currentTheme);
    expect(document.body.getAttribute("data-theme")).toBe(currentTheme);
  });

  it("persists and reapplies a new theme", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    const initialTheme = screen.getByRole("status", { name: /current theme/i }).textContent ?? "";

    act(() => {
      screen.getByRole("button", { name: /switch theme/i }).click();
    });

    const updatedTheme = screen.getByRole("status", { name: /current theme/i }).textContent ?? "";

    expect(updatedTheme).not.toBe(initialTheme);
    expect(document.documentElement.getAttribute("data-theme")).toBe(updatedTheme);
    expect(findStorageKeysForValue(updatedTheme)).toHaveLength(1);
  });
});
