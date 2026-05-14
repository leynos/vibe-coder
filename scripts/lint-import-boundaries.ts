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

export interface LintImportBoundaryDependencies {
  readonly sourceFiles?: ReadonlyArray<SourceFileInput>;
  readonly projectRoot?: string;
  readonly writeError?: (message: string) => void;
  readonly findViolations?: (
    files: ReadonlyArray<SourceFileInput>,
    options?: BoundaryCheckOptions,
  ) => ReadonlyArray<BoundaryViolation>;
}

/** Return source files scanned from the project root for boundary linting. */
export function getSourceFiles(projectRoot = PROJECT_ROOT): SourceFileInput[] {
  const glob = new Bun.Glob(SOURCE_GLOB);
  return Array.from(glob.scanSync({ cwd: projectRoot })).map((path) => {
    try {
      return {
        path,
        sourceText: readFileSync(resolve(projectRoot, path), "utf8"),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`getSourceFiles failed to read ${path}: ${message}`);
      throw error;
    }
  });
}

/** Format one import-boundary violation for CLI stderr output. */
export function formatViolation(violation: BoundaryViolation): string {
  return `${violation.sourcePath}:${violation.line}:${violation.column} ${violation.message}: "${violation.importPath}"`;
}

/** Run the import-boundary CLI and return the intended process exit code. */
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
