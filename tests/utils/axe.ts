import { configureAxe } from "jest-axe";

/**
 * Shared axe runner configured for the component accessibility test suite.
 */
export const axe = configureAxe({
  rules: {
    // Radix focus guards intentionally use `aria-hidden` with tabbable nodes.
    "aria-hidden-focus": { enabled: false },
  },
});
