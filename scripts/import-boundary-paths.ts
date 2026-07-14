/** @file Path and parser helpers for import-boundary checks. */

import { isAbsolute, normalize, relative, sep } from "node:path";

import ts from "typescript";

export {
  PATH_ALIASES,
  type AliasEntry,
  type AliasPrefix,
  type RepoRelativePath,
} from "../tools/path-aliases";
import { PATH_ALIASES } from "../tools/path-aliases";

/**
 * File extensions recognized as TypeScript or JavaScript source files.
 */
export const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"] as const;

/**
 * Pick the TypeScript parser mode for a source file path.
 *
 * @example
 * ```ts
 * getScriptKind("file.tsx"); // ts.ScriptKind.TSX
 * getScriptKind("file.ts"); // ts.ScriptKind.TS
 * ```
 */
export function getScriptKind(path: string): ts.ScriptKind {
  return path.endsWith(".tsx") || path.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/**
 * Normalize paths to repository-relative POSIX separators for comparisons.
 *
 * @example
 * ```ts
 * normalizeForComparison("/repo/src/domain/model.ts", "/repo");
 * // "src/domain/model.ts"
 *
 * normalizeForComparison("src\\domain\\model.ts", undefined);
 * // "src/domain/model.ts"
 * ```
 */
export function normalizeForComparison(path: string, basePath: string | undefined): string {
  if (isAbsolute(path)) {
    if (!basePath) {
      throw new Error(
        "normalizeForComparison: basePath is required when path is absolute; " +
          "supply it via BoundaryCheckOptions.basePath",
      );
    }
    return normalize(relative(basePath, path)).split(sep).join("/");
  }
  return normalize(path).split(sep).join("/");
}

/**
 * Return the caller-supplied base path, or undefined when none was provided.
 *
 * @example
 * ```ts
 * getBasePath({ basePath: "/repo" }); // "/repo"
 * getBasePath({}); // undefined
 * ```
 */
export function getBasePath(options: { readonly basePath?: string }): string | undefined {
  return options.basePath;
}

/**
 * Expand a repository-local path alias into the equivalent `src/` path.
 *
 * @example
 * ```ts
 * expandPathAlias("@domain/model/run");
 * // "src/domain/model/run"
 * ```
 */
export function expandPathAlias(importPath: string): string | undefined {
  for (const [alias, target] of PATH_ALIASES) {
    if (importPath === alias) {
      return target;
    }
    const aliasPrefix = `${alias}/`;
    if (importPath.startsWith(aliasPrefix)) {
      return `${target}/${importPath.slice(aliasPrefix.length)}`;
    }
  }

  return undefined;
}
