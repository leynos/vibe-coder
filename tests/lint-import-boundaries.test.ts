/**
 * @file Tests for the import-boundary CLI wrapper.
 *
 * Verifies source scanning, formatted diagnostics, and exit codes without
 * spawning a separate Bun process.
 */

import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { BoundaryViolation, SourceFileInput } from "../scripts/import-boundaries";
import { formatViolation, getSourceFiles, main } from "../scripts/lint-import-boundaries";

function buildSourceFile(overrides: Partial<SourceFileInput> = {}): SourceFileInput {
  return {
    path: "src/domain/model.ts",
    sourceText: "export const model = {};",
    ...overrides,
  };
}

function buildViolation(overrides: Partial<BoundaryViolation> = {}): BoundaryViolation {
  return {
    sourcePath: "src/domain/model.ts",
    line: 1,
    column: 1,
    message: "domain files must not import adapter files",
    importPath: "../adapters/http",
    ...overrides,
  };
}

describe("getSourceFiles", () => {
  it("scans every supported source extension from the project root", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-coder-imports-"));

    try {
      mkdirSync(join(projectRoot, "src/domain"), { recursive: true });
      writeFileSync(join(projectRoot, "src/domain/model.ts"), "export const model = {};");
      writeFileSync(join(projectRoot, "src/domain/view.tsx"), "export const View = () => null;");
      writeFileSync(join(projectRoot, "src/domain/script.js"), "export const script = {};");
      writeFileSync(join(projectRoot, "src/domain/view.jsx"), "export const View = () => null;");
      writeFileSync(join(projectRoot, "src/domain/module.mts"), "export const module = {};");
      writeFileSync(join(projectRoot, "src/domain/common.cts"), "export const common = {};");

      const files = getSourceFiles(projectRoot);

      expect(files.map((file) => file.path).sort()).toEqual([
        "src/domain/common.cts",
        "src/domain/model.ts",
        "src/domain/module.mts",
        "src/domain/script.js",
        "src/domain/view.jsx",
        "src/domain/view.tsx",
      ]);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});

describe("formatViolation", () => {
  it("formats CLI diagnostics with source, location, message, and import path", () => {
    expect(
      formatViolation(
        buildViolation({
          line: 3,
          column: 5,
        }),
      ),
    ).toMatchInlineSnapshot(
      `"src/domain/model.ts:3:5 domain files must not import adapter files: "../adapters/http""`,
    );
  });
});

describe("main", () => {
  it("writes violations and returns a failing exit code", () => {
    const messages: string[] = [];
    const exitCode = main({
      sourceFiles: [
        buildSourceFile({
          sourceText: 'import "../adapters/http";',
        }),
        buildSourceFile({
          path: "src/adapters/http.ts",
        }),
      ],
      writeError: (message) => messages.push(message),
    });

    expect(exitCode).toBe(1);
    expect(messages).toMatchInlineSnapshot(`
      [
        "src/domain/model.ts:1:1 domain files must not import adapter files: "../adapters/http"",
      ]
    `);
  });

  it("returns success when no violations are found", () => {
    const messages: string[] = [];
    const exitCode = main({
      sourceFiles: [buildSourceFile()],
      writeError: (message) => messages.push(message),
    });

    expect(exitCode).toBe(0);
    expect(messages).toEqual([]);
  });
});
