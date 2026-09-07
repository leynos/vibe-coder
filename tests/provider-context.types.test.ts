/**
 * @file Compile-time contract tests for the provider context types.
 *
 * The documentation gate required `DisplayModeContextValue`,
 * `ThemeContextValue`, `ThemeName` and `AVAILABLE_THEMES` to become exports,
 * which makes them public API that callers may name. These assertions pin the
 * shape of that API; the `@ts-expect-error` cases are enforced by
 * `bun check:types` because `tsconfig.json` includes `tests/`.
 */

import { describe, expectTypeOf, test } from "bun:test";

import type {
  DisplayMode,
  DisplayModeContextValue,
} from "../src/app/providers/display-mode-provider";
import { useDisplayMode } from "../src/app/providers/display-mode-provider";
import type { ThemeContextValue, ThemeName } from "../src/app/providers/theme-provider";
import { AVAILABLE_THEMES, useTheme } from "../src/app/providers/theme-provider";

describe("display mode context type contracts", () => {
  test("the exported hook returns the exported context type", () => {
    expectTypeOf(useDisplayMode).returns.toEqualTypeOf<DisplayModeContextValue>();
    expectTypeOf<DisplayModeContextValue["mode"]>().toEqualTypeOf<DisplayMode>();
    expectTypeOf<Parameters<DisplayModeContextValue["setMode"]>>().toEqualTypeOf<
      [next: DisplayMode]
    >();
  });

  test("rejects a mode outside the declared union", () => {
    // @ts-expect-error: the display mode union is limited to the two shell layouts.
    const invalidMode: DisplayMode = "kiosk";

    void invalidMode;
  });
});

describe("theme context type contracts", () => {
  test("the exported hook returns the exported context type", () => {
    expectTypeOf(useTheme).returns.toEqualTypeOf<ThemeContextValue>();
    expectTypeOf<ThemeContextValue["theme"]>().toEqualTypeOf<ThemeName>();
    expectTypeOf<ThemeContextValue["themes"]>().toEqualTypeOf<readonly ThemeName[]>();
  });

  test("the theme name union is derived from the exported theme list", () => {
    expectTypeOf<(typeof AVAILABLE_THEMES)[number]>().toEqualTypeOf<ThemeName>();
    expectTypeOf(AVAILABLE_THEMES).toEqualTypeOf<readonly ["vibe-coder-night", "vibe-coder-day"]>();
  });

  test("rejects a theme outside the shipped list", () => {
    // @ts-expect-error: theme names must come from AVAILABLE_THEMES.
    const invalidTheme: ThemeName = "vibe-coder-dusk";

    void invalidTheme;
  });
});
