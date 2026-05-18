/**
 * @file Tests for the import-boundary CLI wrapper.
 *
 * Verifies source scanning, formatted diagnostics, and exit codes without
 * spawning a separate Bun process.
 */

import { describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { BoundaryViolation, SourceFileInput } from "../scripts/import-boundaries";
import { formatViolation, getSourceFiles, main } from "../scripts/lint-import-boundaries";

/**
 * Build a minimal {@link SourceFileInput} fixture for use in tests.
 *
 * @param overrides - Optional properties merged over the default fixture.
 * @returns A complete {@link SourceFileInput} object.
 *
 * @example
 * ```ts
 * buildSourceFile({ path: "src/adapters/http.ts" });
 * // { path: "src/adapters/http.ts", sourceText: "export const model = {};" }
 * ```
 */
function buildSourceFile(overrides: Partial<SourceFileInput> = {}): SourceFileInput {
  return {
    path: "src/domain/model.ts",
    sourceText: "export const model = {};",
    ...overrides,
  };
}

/**
 * Build a minimal {@link BoundaryViolation} fixture for use in tests.
 *
 * @param overrides - Optional properties merged over the default fixture.
 * @returns A complete {@link BoundaryViolation} object.
 *
 * @example
 * ```ts
 * buildViolation({ line: 3, column: 5 });
 * // {
 * //   sourcePath: "src/domain/model.ts",
 * //   line: 3,
 * //   column: 5,
 * //   message: "domain files must not import adapter files",
 * //   importPath: "../adapters/http",
 * // }
 * ```
 */
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

  it("throws and logs when a source file cannot be read", () => {
    const projectRoot = mkdtempSync(join(tmpdir(), "vibe-coder-imports-err-"));
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    try {
      mkdirSync(join(projectRoot, "src/domain"), { recursive: true });
      writeFileSync(join(projectRoot, "src/domain/model.ts"), "export const model = {};");

      expect(() =>
        getSourceFiles(projectRoot, () => {
          throw new Error("scan failed");
        }),
      ).toThrow("scan failed");
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("getSourceFiles failed to read src/domain/model.ts"),
      );
    } finally {
      errorSpy.mockRestore();
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
      writeInfo: () => {},
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
      writeInfo: () => {},
    });

    expect(exitCode).toBe(0);
    expect(messages).toEqual([]);
  });

  it("propagates exceptions thrown by findViolations", () => {
    expect(() =>
      main({
        sourceFiles: [buildSourceFile()],
        findViolations: () => {
          throw new Error("scan failed");
        },
        writeError: () => {},
        writeInfo: () => {},
      }),
    ).toThrow("scan failed");
  });

  it("logs scan start, file count, and completion summary", () => {
    const messages: string[] = [];
    const exitCode = main({
      sourceFiles: [buildSourceFile()],
      projectRoot: "/project",
      writeError: () => {},
      writeInfo: (message) => messages.push(message),
    });

    expect(exitCode).toBe(0);
    expect(messages).toEqual([
      'lint-import-boundaries start: projectRoot="/project"',
      "lint-import-boundaries scanned: files=1",
      "lint-import-boundaries completed: files=1 violations=0 exitCode=0",
    ]);
  });

  it("logs failure category and message when violation detection throws", () => {
    const messages: string[] = [];

    expect(() =>
      main({
        sourceFiles: [buildSourceFile()],
        findViolations: () => {
          throw new TypeError("scan failed");
        },
        projectRoot: "/project",
        writeError: (message) => messages.push(message),
        writeInfo: () => {},
      }),
    ).toThrow("scan failed");
    expect(messages).toEqual([
      'lint-import-boundaries failed: category="TypeError" message="scan failed"',
    ]);
  });

  it("reports every violation when multiple exist", () => {
    const messages: string[] = [];
    const exitCode = main({
      sourceFiles: [
        buildSourceFile({
          path: "src/domain/bad.ts",
          sourceText: ['import "../adapters/http";', 'import "../adapters/db";'].join("\n"),
        }),
        buildSourceFile({ path: "src/adapters/http.ts" }),
        buildSourceFile({ path: "src/adapters/db.ts" }),
      ],
      writeError: (message) => messages.push(message),
      writeInfo: () => {},
    });

    expect(exitCode).toBe(1);
    expect(messages).toEqual([
      'src/domain/bad.ts:1:1 domain files must not import adapter files: "../adapters/http"',
      'src/domain/bad.ts:2:1 domain files must not import adapter files: "../adapters/db"',
    ]);
  });
});
