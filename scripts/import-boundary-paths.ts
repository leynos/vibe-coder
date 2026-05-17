/** @file Path and parser helpers for import-boundary checks. */

import { isAbsolute, normalize, relative, sep } from "node:path";

import ts from "typescript";

export const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"] as const;

/** Pick the TypeScript parser mode for a source file path. */
export function getScriptKind(path: string): ts.ScriptKind {
  return path.endsWith(".tsx") || path.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/** Normalize paths to repository-relative POSIX separators for comparisons. */
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

/** Return the caller-supplied base path, or undefined when none was provided. */
export function getBasePath(options: { readonly basePath?: string | undefined }): string | undefined {
  return options.basePath;
}
