/**
 * @file Compile-time contracts for the hand-written ambient declarations.
 *
 * Bun's test runner does not discover this file; `tsc` typechecks it. Each
 * `@ts-expect-error` documents an argument the declarations must reject, so a
 * declaration that silently widens fails the build instead of accepting
 * invalid usage.
 */

import { expect } from "bun:test";
import type { AxeResults } from "axe-core";
import FluentBackend from "i18next-fluent-backend";
import { axe } from "jest-axe";

import {
  deriveThemeArtefacts,
  formatCssBlock,
  resolveReferences,
  type ThemeArtefacts,
  type ThemeMeta,
  type TokenValue,
  toFontArray,
  toTitleCase,
  unwrap,
} from "../tokens/build/token-resolve.js";

const themeMeta: ThemeMeta = {
  name: "contract",
  displayName: "Contract",
  default: true,
  prefersDark: false,
  prefersLight: false,
};

/** The jest-axe declaration accepts markup and returns Axe results. */
export function runAxe(markup: string): Promise<AxeResults> {
  return axe(markup, {});
}

/** A non-element, non-string argument must be rejected. */
export function rejectNonMarkupAxeArgument(): void {
  // @ts-expect-error the jest-axe declaration only accepts DOM nodes or markup.
  void axe(42);
}

/** The Fluent backend declaration is constructible and has the expected shape. */
export function createBackend(): FluentBackend {
  return new FluentBackend();
}

/** The backend constructor rejects a non-`Services` argument. */
export function rejectInvalidBackendArgument(): FluentBackend {
  // @ts-expect-error the first constructor argument must be i18next services.
  return new FluentBackend(42);
}

/** The `bun:test` augmentation exposes the project's custom matchers. */
export function expectAccessibilityMatchers(element: HTMLElement, results: AxeResults): void {
  expect(element).toBeInTheDocument();
  expect(results).toHaveNoViolations();
}

/** The augmented matchers take no arguments. */
export function rejectMatcherArguments(element: HTMLElement): void {
  // @ts-expect-error `toBeInTheDocument` takes no arguments.
  expect(element).toBeInTheDocument("unexpected");
}

/** The React act flag is declared on the global object as a boolean. */
export function setActEnvironment(enabled: boolean): void {
  globalThis.IS_REACT_ACT_ENVIRONMENT = enabled;
}

/** The React act flag cannot be assigned a non-boolean value. */
export function rejectNonBooleanActEnvironment(): void {
  // @ts-expect-error the React act flag is a boolean.
  globalThis.IS_REACT_ACT_ENVIRONMENT = "yes";
}

/** The token helpers accept JSON-like values and keep their declared types. */
export function tokenHelperContracts(): readonly TokenValue[] {
  return [
    unwrap({ color: { base: "#ffffff" } }),
    resolveReferences("{color.base}", new Map([["color.base", "#ffffff"]])),
    formatCssBlock(":root", { "--color-base": "#ffffff" }),
    toFontArray("Inter, system-ui"),
    toTitleCase("vibe_coder-night"),
  ];
}

/** Invalid token-helper usage must not typecheck. */
export function rejectInvalidTokenHelperUsage(): void {
  // @ts-expect-error token values cannot be functions.
  unwrap(() => "#ffffff");
  // @ts-expect-error declarations map custom-property names to string values.
  formatCssBlock(":root", { "--color-base": 1 });
  // @ts-expect-error the font list is a string, not an array.
  toFontArray(["Inter"]);
  // @ts-expect-error resolved tokens are not numbers.
  const count: number = resolveReferences("literal", new Map());
  void count;
  // @ts-expect-error theme metadata requires a display name.
  const incompleteMeta: ThemeMeta = {
    name: "contract",
    default: true,
    prefersDark: false,
    prefersLight: false,
  };
  void incompleteMeta;
}

/** Theme artefacts are derived from checked metadata and token objects. */
export function deriveThemeContracts(): ThemeArtefacts {
  return deriveThemeArtefacts(themeMeta, {}, {});
}
