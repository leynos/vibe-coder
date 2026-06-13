/**
 * @file Property tests for path-alias expansion and layer classification.
 */

import { describe, it } from "bun:test";
import fc from "fast-check";

import { classifySourcePath, type SourceLayer } from "../scripts/import-boundaries";
import { expandPathAlias } from "../scripts/import-boundary-paths";
import { PATH_ALIASES, type RepoRelativePath } from "../tools/path-aliases";

const PATH_SEGMENT = fc.constantFrom(
  "model",
  "services",
  "rules",
  "ports",
  "machines",
  "commands",
  "selectors",
  "persistence",
  "rng",
  "audio",
  "render",
  "assets",
  "nested-feature",
);

const REPOSITORY_PATH_SUFFIX = fc
  .array(PATH_SEGMENT, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join("/"));

describe("PATH_ALIASES properties", () => {
  it("expands every alias prefix to its configured source root", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PATH_ALIASES),
        REPOSITORY_PATH_SUFFIX,
        ([alias, target], suffix) => {
          return expandPathAlias(`${alias}/${suffix}`) === `${target}/${suffix}`;
        },
      ),
    );
  });

  it("classifies every expanded alias path as its configured layer", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PATH_ALIASES),
        REPOSITORY_PATH_SUFFIX,
        ([alias, target], suffix) => {
          const expandedPath = expandPathAlias(`${alias}/${suffix}`);

          return (
            expandedPath !== undefined &&
            classifySourcePath(expandedPath) === layerFromAliasTarget(target)
          );
        },
      ),
    );
  });

  it("expands bare alias prefixes to their exact configured targets", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PATH_ALIASES), ([alias, target]) => {
        return expandPathAlias(alias) === target;
      }),
    );
  });
});

/**
 * Map one canonical alias target path to its architectural layer.
 *
 * @param target - Repository-relative alias target from {@link PATH_ALIASES}.
 * @returns The layer represented by the alias target.
 * @throws {Error} If a future alias points outside the known layer roots.
 *
 * @example
 * ```ts
 * layerFromAliasTarget("src/domain" as RepoRelativePath); // "domain"
 * ```
 */
function layerFromAliasTarget(target: RepoRelativePath): SourceLayer {
  const targetPath = String(target);

  if (targetPath === "src/domain") {
    return "domain";
  }
  if (targetPath === "src/application") {
    return "application";
  }
  if (targetPath === "src/adapters") {
    return "adapters";
  }

  throw new Error(`Unsupported alias target: ${targetPath}`);
}
