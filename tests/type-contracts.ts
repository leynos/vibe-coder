/**
 * @file Compile-time contracts for the handwritten ambient declarations.
 *
 * Bun's test runner does not discover this file; `tsc` typechecks it. Each
 * `@ts-expect-error` documents an argument the declarations must reject, so a
 * declaration that silently widens fails the build instead of accepting
 * invalid usage.
 */

import { expect } from "bun:test";
import type { AxeResults } from "axe-core";
import type { ReadCallback, Services } from "i18next";
import FluentBackend from "i18next-fluent-backend";
import { type AxeMatcherResult, axe, toHaveNoViolations } from "jest-axe";

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

/** The backend declaration accepts services, options, and read callbacks. */
export function backendLifecycleContracts(services: Services, callback: ReadCallback): void {
  const backend = new FluentBackend();
  backend.init(services, { loadPath: "/locales/{{lng}}/{{ns}}.ftl" });
  backend.read("en-GB", "common", callback);
}

/** Invalid backend lifecycle calls must not typecheck. */
export function rejectInvalidBackendLifecycle(services: Services, callback: ReadCallback): void {
  const backend = new FluentBackend();
  // @ts-expect-error `init` requires the i18next services argument.
  backend.init();
  // @ts-expect-error `read` requires a read callback.
  backend.read("en-GB", "common");
  // @ts-expect-error `loadPath` must be a string.
  backend.init(services, { loadPath: 42 });
  void callback;
}

/** The `bun:test` augmentation exposes the project's custom matchers. */
export function expectAccessibilityMatchers(element: HTMLElement, results: AxeResults): void {
  expect(element).toBeInTheDocument();
  expect(results).toHaveNoViolations();
}

/** The augmented matchers return the asserted value. */
export function matcherReturnTypes(element: HTMLElement, results: AxeResults): void {
  const returnedElement: HTMLElement = expect(element).toBeInTheDocument();
  const returnedResults: AxeResults = expect(results).toHaveNoViolations();
  void returnedElement;
  void returnedResults;
}

/** The jest-axe matcher object returns a matcher result. */
export function axeMatcherReturnType(results: AxeResults): AxeMatcherResult {
  return toHaveNoViolations.toHaveNoViolations(results);
}

/** Matcher calls do not return `undefined`. */
export function rejectUndefinedMatcherReturn(element: HTMLElement): void {
  // @ts-expect-error the matcher returns the asserted element.
  const ignored: undefined = expect(element).toBeInTheDocument();
  void ignored;
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

/** Optional token-helper arguments may be omitted. */
export function omittedOptionalTokenArguments(): readonly string[] {
  return [toFontArray().join(","), String(resolveReferences("{a}", new Map([["a", "b"]])))];
}

/** Optional arguments still reject values outside their declared types. */
export function rejectInvalidOptionalTokenArguments(): void {
  // @ts-expect-error the font list is an optional string, not null.
  toFontArray(null);
  // @ts-expect-error the reference stack is a set, not an array.
  resolveReferences("{a}", new Map(), []);
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
