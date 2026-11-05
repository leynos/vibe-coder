/**
 * @file Behavioural tests for the Stylelint configuration.
 *
 * `tools/stylelint.config.js` is loaded by `bun semantic`. These cases run the
 * real configuration against fixtures, so a broken plugin reference or a
 * dropped rule fails the test suite rather than only the lint gate.
 */

import { describe, expect, it } from "bun:test";
import path from "node:path";
import stylelint from "stylelint";

const CONFIG_PATH = path.resolve(import.meta.dir, "../tools/stylelint.config.js");

/** Lint one CSS snippet with the repository's real configuration. */
async function lint(code: string) {
  return stylelint.lint({ code, configFile: CONFIG_PATH });
}

/** Collect the rule names that fired for a lint result. */
function firedRules(result: Awaited<ReturnType<typeof lint>>): string[] {
  return result.results.flatMap((entry) => entry.warnings.map((warning) => warning.rule));
}

describe("stylelint config", () => {
  it("rejects raw hex colours", async () => {
    const result = await lint("a { color: #fff; }");

    expect(firedRules(result)).toContain("color-no-hex");
  });

  it("accepts design-token variables", async () => {
    const result = await lint("a { color: var(--color-text); }");

    expect(result.results.flatMap((entry) => entry.warnings)).toHaveLength(0);
  });

  it("rejects !important", async () => {
    const result = await lint("a { color: var(--color-text) !important; }");

    expect(firedRules(result)).toContain("declaration-no-important");
  });
});
