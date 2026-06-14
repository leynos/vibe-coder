/**
 * @file Tests for the shared TypeScript path-alias source of truth.
 */

import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import * as v from "valibot";

import { PATH_ALIASES } from "../tools/path-aliases";

const TsConfigSchema = v.object({
  compilerOptions: v.optional(
    v.object({
      paths: v.optional(v.record(v.string(), v.array(v.string()))),
    }),
  ),
});

describe("PATH_ALIASES", () => {
  it("matches tsconfig compilerOptions.paths", async () => {
    const tsconfig = v.parse(TsConfigSchema, await Bun.file("tsconfig.json").json());

    expect(tsconfig.compilerOptions?.paths).toEqual(buildExpectedTsconfigPaths());
  });

  it("does not contain ambiguous prefix collisions", () => {
    const prefixes = PATH_ALIASES.map(([prefix]) => prefix);

    for (const prefix of prefixes) {
      for (const otherPrefix of prefixes) {
        if (prefix === otherPrefix) {
          continue;
        }

        expect(otherPrefix.startsWith(prefix), `${prefix} must not prefix ${otherPrefix}`).toBe(
          false,
        );
      }
    }
  });

  it("points every alias target at an existing src directory", () => {
    for (const [, target] of PATH_ALIASES) {
      expect(target.startsWith("src/")).toBe(true);
      expect(existsSync(target), `${target} should exist`).toBe(true);
    }
  });
});

/**
 * Build the `tsconfig.json` path map expected from {@link PATH_ALIASES}.
 *
 * @returns A TypeScript `compilerOptions.paths` map.
 *
 * @example
 * ```ts
 * // If PATH_ALIASES contains ["@domain", "src/domain"],
 * buildExpectedTsconfigPaths();
 * // { "@domain/*": ["./src/domain/*"] }
 * ```
 */
function buildExpectedTsconfigPaths(): Record<string, string[]> {
  return Object.fromEntries(
    PATH_ALIASES.map(([prefix, target]) => [`${prefix}/*`, [`./${target}/*`]]),
  );
}
