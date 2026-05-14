/** @file CLI wrapper for the source import-boundary guard. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  type BoundaryCheckOptions,
  type BoundaryViolation,
  findBoundaryViolations,
  type SourceFileInput,
} from "./import-boundaries";

const PROJECT_ROOT = process.cwd();
const SOURCE_GLOB = "src/**/*.{ts,tsx,js,jsx,mts,cts}";

type ReadSourceFile = (path: string, encoding: "utf8") => string;

/**
 * Injected dependencies for `main`, used to replace production defaults in tests.
 *
 * @property sourceFiles - Pre-loaded source files; skips filesystem scanning when supplied.
 * @property projectRoot - Absolute path used as the project root; defaults to `process.cwd()`.
 * @property writeError - Callback receiving each formatted violation string; defaults to `console.error`.
 * @property findViolations - Boundary-check implementation; defaults to `findBoundaryViolations`.
 */
export interface LintImportBoundaryDependencies {
  readonly sourceFiles?: ReadonlyArray<SourceFileInput>;
  readonly projectRoot?: string;
  readonly writeError?: (message: string) => void;
  readonly findViolations?: (
    files: ReadonlyArray<SourceFileInput>,
    options?: BoundaryCheckOptions,
  ) => ReadonlyArray<BoundaryViolation>;
}

/**
 * Return source files scanned from the project root for boundary linting.
 *
 * @param projectRoot - Repository root used for scanning; defaults to `PROJECT_ROOT`.
 * @param readSourceFile - UTF-8 file reader; defaults to `readFileSync`.
 * @returns `SourceFileInput` objects containing repository-relative `path`
 *   values and their `sourceText`.
 *
 * @example
 * ```ts
 * // example only
 * const files: SourceFileInput[] = getSourceFiles();
 * // [{ path: "src/domain/model.ts", sourceText: "..." }]
 * // Uses PROJECT_ROOT by default and throws on read errors.
 * ```
 */
export function getSourceFiles(
  projectRoot = PROJECT_ROOT,
  readSourceFile: ReadSourceFile = readFileSync,
): SourceFileInput[] {
  const glob = new Bun.Glob(SOURCE_GLOB);
  return Array.from(glob.scanSync({ cwd: projectRoot })).map((path) => {
    try {
      return {
        path,
        sourceText: readSourceFile(resolve(projectRoot, path), "utf8"),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`getSourceFiles failed to read ${path}: ${message}`);
      throw error;
    }
  });
}

/**
 * Format one import-boundary violation for CLI stderr output.
 *
 * @param violation - Boundary violation to render.
 * @returns The CLI diagnostic string in
 *   `${sourcePath}:${line}:${column} ${message}: "${importPath}"` form.
 *
 * @example
 * ```ts
 * // example only
 * formatViolation({
 *   sourcePath: "src/domain/model.ts",
 *   line: 3,
 *   column: 5,
 *   message: "domain files must not import adapter files",
 *   importPath: "../adapters/http",
 * });
 * // 'src/domain/model.ts:3:5 domain files must not import adapter files: "../adapters/http"'
 * ```
 */
export function formatViolation(violation: BoundaryViolation): string {
  return `${violation.sourcePath}:${violation.line}:${violation.column} ${violation.message}: "${violation.importPath}"`;
}

/**
 * Run the import-boundary CLI and return the intended process exit code.
 *
 * @param dependencies - Optional test seams for source files, project root,
 *   violation detection, and stderr writing.
 * @returns `1` when violations exist, otherwise `0`.
 *
 * @example
 * ```ts
 * // example only
 * const failingExitCode = main({
 *   sourceFiles: [{ path: "src/domain/model.ts", sourceText: 'import "../adapters/http";' }],
 *   writeError: console.error,
 * });
 * // Writes formatted violations to stderr and returns 1.
 *
 * const passingExitCode = main({ sourceFiles: [] });
 * // Writes nothing and returns 0.
 * ```
 */
export function main(dependencies: LintImportBoundaryDependencies = {}): number {
  const projectRoot = dependencies.projectRoot ?? PROJECT_ROOT;
  const sourceFiles = dependencies.sourceFiles ?? getSourceFiles(projectRoot);
  const findViolations = dependencies.findViolations ?? findBoundaryViolations;
  const writeError = dependencies.writeError ?? console.error;
  const violations = findViolations(sourceFiles, { basePath: projectRoot });

  for (const violation of violations) {
    writeError(formatViolation(violation));
  }

  if (violations.length > 0) {
    return 1;
  }

  return 0;
}

if (import.meta.main) {
  process.exitCode = main();
}
