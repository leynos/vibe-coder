/**
 * @file Tests for the source import-boundary guard.
 *
 * Verifies allowed layer imports and forbidden dependency directions across
 * static imports, re-exports, and dynamic imports.
 */

import { describe, expect, it } from "bun:test";

import { classifySourcePath, findBoundaryViolations } from "../scripts/import-boundaries";

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
  const files = [
    { path: "src/domain/model/run-state.ts", sourceText: "export const runState = {};" },
    { path: "src/domain/services/start-run.ts", sourceText: "export const startRun = () => {};" },
    {
      path: "src/application/selectors/dashboard-selectors.ts",
      sourceText: "export const selectDashboard = () => {};",
    },
    {
      path: "src/adapters/persistence/dexie-game-state-repository.ts",
      sourceText: "export const repository = {};",
    },
    { path: "src/app/routes/title.tsx", sourceText: "export const Title = () => null;" },
  ] as const;

  it("allows domain files to import other domain files", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/services/apply-policy.ts",
        sourceText: 'import "../model/run-state";',
      },
    ]);

    expect(violations).toEqual([]);
  });

  it("allows application files to import domain files", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/application/selectors/risk-selectors.ts",
        sourceText: 'import "../../domain/model/run-state";',
      },
    ]);

    expect(violations).toEqual([]);
  });

  it("allows adapters to import application and domain files", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/adapters/persistence/migrations.ts",
        sourceText: [
          'import "../../application/selectors/dashboard-selectors";',
          'import "../../domain/model/run-state";',
        ].join("\n"),
      },
    ]);

    expect(violations).toEqual([]);
  });

  it("allows app shell files to import every architectural layer", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/app/routes/run.tsx",
        sourceText: [
          'import "../../adapters/persistence/dexie-game-state-repository";',
          'import "../../application/selectors/dashboard-selectors";',
          'import "../../domain/model/run-state";',
        ].join("\n"),
      },
    ]);

    expect(violations).toEqual([]);
  });

  it("rejects domain files importing application files", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/services/simulate-tick.ts",
        sourceText: 'import "../../application/selectors/dashboard-selectors";',
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toBe("domain files must not import application files");
  });

  it("rejects domain files importing adapter files", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/services/simulate-tick.ts",
        sourceText: 'import "../../adapters/persistence/dexie-game-state-repository";',
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toBe("domain files must not import adapter files");
  });

  it("rejects application files importing adapter files", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/application/selectors/chart-selectors.ts",
        sourceText: 'import "../../adapters/persistence/dexie-game-state-repository";',
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toBe("application files must not import adapter files");
  });

  it("rejects domain files importing disallowed infrastructure packages", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/services/resolve-event.ts",
        sourceText: 'import { createRoot } from "react-dom/client";',
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toBe("domain files must not import React DOM");
  });

  it("checks dynamic import expressions as imports", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/services/lazy-load-save.ts",
        sourceText: [
          "export async function loadSaveAdapter() {",
          '  return await import("../../adapters/persistence/dexie-game-state-repository");',
          "}",
        ].join("\n"),
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toBe("domain files must not import adapter files");
    expect(violations[0]?.line).toBe(2);
  });

  it("rejects domain dynamic imports that do not use literal module specifiers", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/services/lazy-load-save.ts",
        sourceText: [
          "export async function loadSaveAdapter(modulePath: string) {",
          "  return await import(modulePath);",
          "}",
        ].join("\n"),
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.importPath).toBe("__NON_LITERAL_DYNAMIC_IMPORT__");
    expect(violations[0]?.message).toBe("domain files must not use non-literal dynamic imports");
  });

  it("rejects application dynamic imports that do not use literal module specifiers", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/application/selectors/lazy-chart.ts",
        sourceText: [
          "export async function loadChart(modulePath: string) {",
          "  return await import(modulePath);",
          "}",
        ].join("\n"),
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.importPath).toBe("__NON_LITERAL_DYNAMIC_IMPORT__");
    expect(violations[0]?.message).toBe(
      "application files must not use non-literal dynamic imports",
    );
  });

  it("checks re-export declarations as imports", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/index.ts",
        sourceText:
          'export { selectDashboard } from "../application/selectors/dashboard-selectors";',
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.importPath).toBe("../application/selectors/dashboard-selectors");
  });

  it("resolves relative imports that climb directories", () => {
    const violations = findBoundaryViolations([
      ...files,
      {
        path: "src/domain/rules/debt.ts",
        sourceText: 'import "../../adapters/persistence/migrations";',
      },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toBe("domain files must not import adapter files");
  });
});
