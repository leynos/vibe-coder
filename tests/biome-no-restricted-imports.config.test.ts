/**
 * @file Configuration tests for Biome import-boundary restrictions.
 */

import { describe, expect, it } from "bun:test";

import { PATH_ALIASES } from "../tools/path-aliases";
import { getNoRestrictedImportsOverride, readBiomeConfig } from "./biome-config-helpers";

describe("Biome noRestrictedImports boundary overrides", () => {
  it("configures domain and application overrides", async () => {
    const config = await readBiomeConfig();
    const includes = config.overrides?.flatMap((override) => override.includes ?? []) ?? [];

    expect(includes).toContain("src/domain/**");
    expect(includes).toContain("src/application/**");
  });

  it("derives forbidden domain patterns from PATH_ALIASES", async () => {
    const config = await readBiomeConfig();
    const rule = getNoRestrictedImportsOverride(config, "src/domain/**");
    const patterns = rule.options.patterns;

    expect(patterns).toBeDefined();
    expect(patterns).toHaveLength(1);
    const group = patterns?.[0]?.group;
    expect(group).toBeDefined();
    expect([...(group ?? [])].sort()).toEqual(
      buildForbiddenPatterns(["application", "adapters"]).sort(),
    );
    expect(group?.every((pattern) => !pattern.startsWith("**/"))).toBe(true);
  });

  it("derives forbidden application patterns from PATH_ALIASES", async () => {
    const config = await readBiomeConfig();
    const rule = getNoRestrictedImportsOverride(config, "src/application/**");
    const patterns = rule.options.patterns;

    expect(patterns).toBeDefined();
    expect(patterns).toHaveLength(1);
    const group = patterns?.[0]?.group;
    expect(group).toBeDefined();
    expect([...(group ?? [])].sort()).toEqual(buildForbiddenPatterns(["adapters"]).sort());
    expect(group?.every((pattern) => !pattern.startsWith("**/"))).toBe(true);
  });

  it("rejects infrastructure packages in the expected layers", async () => {
    const config = await readBiomeConfig();
    const domainPaths = getNoRestrictedImportsOverride(config, "src/domain/**").options.paths ?? {};
    const applicationPaths =
      getNoRestrictedImportsOverride(config, "src/application/**").options.paths ?? {};

    expect(Object.keys(domainPaths).sort()).toEqual([
      "dexie",
      "react",
      "react-dom",
      "react-dom/client",
    ]);
    expect(Object.keys(applicationPaths).sort()).toEqual([
      "dexie",
      "react",
      "react-dom",
      "react-dom/client",
    ]);
  });
});

/**
 * Derive the expected Biome glob patterns for forbidden layer imports.
 *
 * @param layers - Architectural target layers that should be blocked.
 * @returns The unique alias, absolute, bare, and parent-relative patterns.
 */
function buildForbiddenPatterns(layers: ReadonlyArray<"application" | "adapters">): string[] {
  const layerSet = new Set(layers);

  const patterns = PATH_ALIASES.flatMap(([prefix, target]) => {
    const layer = target.replace("src/", "");
    if (layer !== "application" && layer !== "adapters") {
      return [];
    }
    if (!layerSet.has(layer)) {
      return [];
    }

    return [
      `${prefix}`,
      `${prefix}/**`,
      `${target}`,
      `${target}/**`,
      `${layer}`,
      `${layer}/**`,
      `../${layer}`,
      `../${layer}/**`,
      `../../${layer}`,
      `../../${layer}/**`,
      `../**/${layer}/**`,
    ];
  });

  return [...new Set(patterns)];
}
