/**
 * @file Tests for the source import-boundary guard.
 *
 * Verifies allowed layer imports and forbidden dependency directions across
 * static imports, re-exports, and dynamic imports.
 */

import { describe, expect, it } from "bun:test";

import {
  type BoundaryViolation,
  classifySourcePath,
  findBoundaryViolations,
  type SourceFileInput,
} from "../scripts/import-boundaries";

describe("classifySourcePath", () => {
  it("classifies source paths by architectural layer", () => {
    expect(classifySourcePath("src/domain/index.ts")).toBe("domain");
    expect(classifySourcePath("src/application/index.ts")).toBe("application");
    expect(classifySourcePath("src/adapters/index.ts")).toBe("adapters");
    expect(classifySourcePath("src/app/app.tsx")).toBe("app");
    expect(classifySourcePath("src/main.tsx")).toBe("other");
  });
});

describe("findBoundaryViolations", () => {
  const baseFiles = [
    buildFile("src/domain/model/run-state.ts", "export const runState = {};"),
    buildFile("src/domain/services/start-run.ts", "export const startRun = () => {};"),
    buildFile(
      "src/application/selectors/dashboard-selectors.ts",
      "export const selectDashboard = () => {};",
    ),
    buildFile(
      "src/adapters/persistence/dexie-game-state-repository.ts",
      "export const repository = {};",
    ),
    buildFile("src/app/routes/title.tsx", "export const Title = () => null;"),
  ] as const;

  const allowedCases = [
    {
      name: "allows domain files to import other domain files",
      extraFile: buildFile("src/domain/services/apply-policy.ts", 'import "../model/run-state";'),
    },
    {
      name: "allows application files to import domain files",
      extraFile: buildFile(
        "src/application/selectors/risk-selectors.ts",
        'import "../../domain/model/run-state";',
      ),
    },
    {
      name: "allows application files to import other application files",
      extraFile: buildFile(
        "src/application/services/build-dashboard.ts",
        'import "../selectors/dashboard-selectors";',
      ),
    },
    {
      name: "allows adapters to import application and domain files",
      extraFile: buildFile(
        "src/adapters/persistence/migrations.ts",
        [
          'import "../../application/selectors/dashboard-selectors";',
          'import "../../domain/model/run-state";',
        ].join("\n"),
      ),
    },
    {
      name: "allows adapters to import other adapter files",
      extraFile: buildFile(
        "src/adapters/persistence/migrations.ts",
        'import "./dexie-game-state-repository";',
      ),
    },
    {
      name: "allows app shell files to import every architectural layer",
      extraFile: buildFile(
        "src/app/routes/run.tsx",
        [
          'import "../../adapters/persistence/dexie-game-state-repository";',
          'import "../../application/selectors/dashboard-selectors";',
          'import "../../domain/model/run-state";',
        ].join("\n"),
      ),
    },
  ] as const;

  for (const { name, extraFile } of allowedCases) {
    it(name, () => {
      expect(findViolationsWith(extraFile)).toEqual([]);
    });
  }

  const violationCases = [
    {
      name: "rejects domain files importing application files",
      extraFile: buildFile(
        "src/domain/services/simulate-tick.ts",
        'import "../../application/selectors/dashboard-selectors";',
      ),
      expected: { message: "domain files must not import application files" },
    },
    {
      name: "rejects domain files importing adapter files",
      extraFile: buildFile(
        "src/domain/services/simulate-tick.ts",
        'import "../../adapters/persistence/dexie-game-state-repository";',
      ),
      expected: { message: "domain files must not import adapter files" },
    },
    {
      name: "rejects application files importing adapter files",
      extraFile: buildFile(
        "src/application/selectors/chart-selectors.ts",
        'import "../../adapters/persistence/dexie-game-state-repository";',
      ),
      expected: { message: "application files must not import adapter files" },
    },
    {
      name: "rejects domain files importing app shell files",
      extraFile: buildFile(
        "src/domain/services/resolve-route.ts",
        'import "../../app/routes/title";',
      ),
      expected: { message: "domain files must not import app shell files" },
    },
    {
      name: "rejects application files importing app shell files",
      extraFile: buildFile(
        "src/application/selectors/title-selectors.ts",
        'import "../../app/routes/title";',
      ),
      expected: { message: "application files must not import app shell files" },
    },
    {
      name: "rejects domain files importing disallowed infrastructure packages",
      extraFile: buildFile(
        "src/domain/services/resolve-event.ts",
        'import { createRoot } from "react-dom/client";',
      ),
      expected: { message: "domain files must not import React DOM" },
    },
    {
      name: "checks dynamic import expressions as imports",
      extraFile: buildFile(
        "src/domain/services/lazy-load-save.ts",
        [
          "export async function loadSaveAdapter() {",
          '  return await import("../../adapters/persistence/dexie-game-state-repository");',
          "}",
        ].join("\n"),
      ),
      expected: { message: "domain files must not import adapter files", line: 2 },
    },
    {
      name: "checks no-substitution template dynamic imports as imports",
      extraFile: buildFile(
        "src/domain/services/lazy-load-save.ts",
        [
          "export async function loadSaveAdapter() {",
          "  return await import(`../../adapters/persistence/dexie-game-state-repository`);",
          "}",
        ].join("\n"),
      ),
      expected: { message: "domain files must not import adapter files" },
    },
    {
      name: "rejects substitution template dynamic imports in guarded layers",
      extraFile: buildFile(
        "src/domain/services/lazy-load-save.ts",
        [
          "export async function loadSaveAdapter(name: string) {",
          "  return await import(`../../adapters/${" + "name}`);",
          "}",
        ].join("\n"),
      ),
      expected: {
        importPath: "__NON_LITERAL_DYNAMIC_IMPORT__",
        message: "domain files must not use non-literal dynamic imports",
      },
    },
    {
      name: "rejects domain dynamic imports that do not use literal module specifiers",
      extraFile: buildFile(
        "src/domain/services/lazy-load-save.ts",
        [
          "export async function loadSaveAdapter(modulePath: string) {",
          "  return await import(modulePath);",
          "}",
        ].join("\n"),
      ),
      expected: {
        importPath: "__NON_LITERAL_DYNAMIC_IMPORT__",
        message: "domain files must not use non-literal dynamic imports",
      },
    },
    {
      name: "rejects application dynamic imports that do not use literal module specifiers",
      extraFile: buildFile(
        "src/application/selectors/lazy-chart.ts",
        [
          "export async function loadChart(modulePath: string) {",
          "  return await import(modulePath);",
          "}",
        ].join("\n"),
      ),
      expected: {
        importPath: "__NON_LITERAL_DYNAMIC_IMPORT__",
        message: "application files must not use non-literal dynamic imports",
      },
    },
    {
      name: "checks re-export declarations as imports",
      extraFile: buildFile(
        "src/domain/index.ts",
        'export { selectDashboard } from "../application/selectors/dashboard-selectors";',
      ),
      expected: { importPath: "../application/selectors/dashboard-selectors" },
    },
    {
      name: "checks import type queries as imports",
      extraFile: buildFile(
        "src/domain/services/adapter-type.ts",
        'type Repository = import("../../adapters/persistence/dexie-game-state-repository").Repository;',
      ),
      expected: { message: "domain files must not import adapter files" },
    },
    {
      name: "resolves relative imports that climb directories",
      extraFile: buildFile(
        "src/domain/rules/debt.ts",
        'import "../../adapters/persistence/migrations";',
      ),
      expected: { message: "domain files must not import adapter files" },
    },
  ] as const;

  for (const { name, extraFile, expected } of violationCases) {
    it(name, () => {
      const violations = findViolationsWith(extraFile);

      expect(violations).toHaveLength(1);
      expectViolation(violations[0], expected);
    });
  }

  function findViolationsWith(extraFile: SourceFileInput): ReadonlyArray<BoundaryViolation> {
    return findBoundaryViolations([...baseFiles, extraFile]);
  }
});

function buildFile(path: string, sourceText: string): SourceFileInput {
  return { path, sourceText };
}

function expectViolation(
  violation: BoundaryViolation | undefined,
  expected: Partial<Pick<BoundaryViolation, "importPath" | "line" | "message">>,
): void {
  if (expected.message) {
    expect(violation?.message).toBe(expected.message);
  }
  if (expected.line) {
    expect(violation?.line).toBe(expected.line);
  }
  if (expected.importPath) {
    expect(violation?.importPath).toBe(expected.importPath);
  }
}
