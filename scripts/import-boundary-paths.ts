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
  const repositoryPath = isAbsolute(path) ? relative(basePath, path) : path;
  return normalize(repositoryPath).split(sep).join("/");
}

/** Resolve the repository base path used for absolute path normalization. */
export function getBasePath(options: { readonly basePath?: string }): string {
  return options.basePath ?? process.cwd();
}
