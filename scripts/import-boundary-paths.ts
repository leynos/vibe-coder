/** @file Path and parser helpers for import-boundary checks. */

import { isAbsolute, normalize, relative, sep } from "node:path";

import ts from "typescript";

export const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"] as const;

/** Pick the TypeScript parser mode for a source file path. */
export function getScriptKind(path: string): ts.ScriptKind {
  return path.endsWith(".tsx") || path.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/** Normalize paths to repository-relative POSIX separators for comparisons. */
export function normalizeForComparison(path: string, basePath: string): string {
  if (isAbsolute(path)) {
    return normalize(relative(basePath, path)).split(sep).join("/");
  }
  return normalize(path).split(sep).join("/");
}

/** Return the caller-supplied base path for repository path normalization. */
export function getBasePath(options: { readonly basePath: string }): string {
  return options.basePath;
}
