/** @file CLI wrapper for the source import-boundary guard. */

import { readFileSync } from "node:fs";

import { findBoundaryViolations, type SourceFileInput } from "./import-boundaries";

const PROJECT_ROOT = process.cwd();

function getSourceFiles(): SourceFileInput[] {
  const glob = new Bun.Glob("src/**/*.{ts,tsx}");
  return Array.from(glob.scanSync(PROJECT_ROOT)).map((path) => ({
    path,
    sourceText: readFileSync(path, "utf8"),
  }));
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
