/** @file CLI wrapper for the source import-boundary guard. */

import { readFileSync } from "node:fs";

import { findBoundaryViolations, type SourceFileInput } from "./import-boundaries";

const PROJECT_ROOT = process.cwd();

function getSourceFiles(): SourceFileInput[] {
  const glob = new Bun.Glob("src/**/*.{ts,tsx,js,jsx,mts,cts}");
  return Array.from(glob.scanSync(PROJECT_ROOT)).map((path) => {
    try {
      return {
        path,
        sourceText: readFileSync(path, "utf8"),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`getSourceFiles failed to read ${path}: ${message}`);
      throw error;
    }
  });
}

function main(): void {
  const violations = findBoundaryViolations(getSourceFiles());

  for (const violation of violations) {
    console.error(
      `${violation.sourcePath}:${violation.line}:${violation.column} ${violation.message}: ` +
        `"${violation.importPath}"`,
    );
  }

  if (violations.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  main();
}
