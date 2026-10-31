/**
 * @file Vitest setup for the accessibility suite.
 *
 * Adds jest-dom matchers, jest-axe's `toHaveNoViolations`, Testing Library
 * cleanup, and the shared i18n harness used by the a11y specs.
 */

import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/dom";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";
import { afterEach, expect } from "vitest";

import { setupI18nTestHarness } from "./support/i18n-test-runtime";
import { installMatchMediaStub } from "./support/match-media-stub";

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

installMatchMediaStub();

await setupI18nTestHarness();
