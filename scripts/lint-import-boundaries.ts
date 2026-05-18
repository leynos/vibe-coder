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
type WriteLog = (message: string) => void;

/**
 * `LintImportBoundaryDependencies` is the public seam for `main`, used to
 * replace production defaults in tests. Its members provide pre-loaded
 * `sourceFiles`, an optional `projectRoot`, log sinks, and a `findViolations`
 * implementation.
 *
 * @property sourceFiles - Pre-loaded source files; skips filesystem scanning when supplied.
 * @property projectRoot - Absolute path used as the project root; defaults to `process.cwd()`.
 * @property writeError - Callback receiving each formatted violation string; defaults to `console.error`.
 * @property writeInfo - Callback receiving operation progress messages; defaults to `console.info`.
 * @property findViolations - Boundary-check implementation; defaults to `findBoundaryViolations`.
 *
 * @example
 * ```ts
 * // example only
 * const exitCode = main({
 *   sourceFiles: [{ path: "src/domain/model.ts", sourceText: 'import "../adapters/http";' }],
 *   writeError: (message) => console.error(message),
 * });
 * // Returns 1 when violations are written, otherwise 0.
 * ```
 */
export interface LintImportBoundaryDependencies {
  readonly sourceFiles?: ReadonlyArray<SourceFileInput>;
  readonly projectRoot?: string;
  readonly writeError?: WriteLog;
  readonly writeInfo?: WriteLog;
  readonly findViolations?: (
    files: ReadonlyArray<SourceFileInput>,
    options: BoundaryCheckOptions,
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
  const findViolations = dependencies.findViolations ?? findBoundaryViolations;
  const writeError = dependencies.writeError ?? console.error;
  const writeInfo = dependencies.writeInfo ?? console.info;

  writeInfo(`lint-import-boundaries start: projectRoot="${projectRoot}"`);

  const sourceFiles = dependencies.sourceFiles ?? getSourceFiles(projectRoot);
  writeInfo(`lint-import-boundaries scanned: files=${sourceFiles.length}`);

  let violations: ReadonlyArray<BoundaryViolation>;
  try {
    violations = findViolations(sourceFiles, { basePath: projectRoot });
  } catch (error) {
    writeError(
      `lint-import-boundaries failed: category="${getErrorCategory(error)}" message="${getErrorMessage(error)}"`,
    );
    throw error;
  }

  for (const violation of violations) {
    writeError(formatViolation(violation));
  }

  const exitCode = violations.length > 0 ? 1 : 0;
  writeInfo(
    `lint-import-boundaries completed: files=${sourceFiles.length} violations=${violations.length} exitCode=${exitCode}`,
  );

  if (violations.length > 0) {
    return 1;
  }

  return 0;
}

/**
 * Return a stable category for an unknown failure value.
 *
 * @example
 * ```ts
 * getErrorCategory(new TypeError("bad input")); // "TypeError"
 * getErrorCategory("bad input"); // "string"
 * ```
 */
function getErrorCategory(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

/**
 * Return a printable message for an unknown failure value.
 *
 * @example
 * ```ts
 * getErrorMessage(new Error("scan failed")); // "scan failed"
 * getErrorMessage("scan failed"); // "scan failed"
 * ```
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.main) {
  process.exitCode = main();
}
