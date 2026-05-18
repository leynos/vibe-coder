/**
 * @file Shared import-boundary violation fixtures for behavioural tests.
 */

import type { BoundaryViolation } from "../scripts/import-boundaries";

export interface ImportBoundaryViolationCase {
  readonly name: string;
  readonly extraFile: {
    readonly path: string;
    readonly sourceText: string;
  };
  readonly expected: Partial<Pick<BoundaryViolation, "importPath" | "line" | "message">>;
}

/**
 * Single-violation cases for the import-boundary checker.
 *
 * @example
 * ```ts
 * violationCases[0]?.expected.message;
 * // "domain files must not import application files"
 * ```
 */
export const violationCases: ReadonlyArray<ImportBoundaryViolationCase> = [
  {
    name: "rejects domain files importing application files",
    extraFile: {
      path: "src/domain/services/simulate-tick.ts",
      sourceText: 'import "../../application/selectors/dashboard-selectors";',
    },
    expected: { message: "domain files must not import application files" },
  },
  {
    name: "rejects domain files importing adapter files",
    extraFile: {
      path: "src/domain/services/simulate-tick.ts",
      sourceText: 'import "../../adapters/persistence/dexie-game-state-repository";',
    },
    expected: { message: "domain files must not import adapter files" },
  },
  {
    name: "rejects application files importing adapter files",
    extraFile: {
      path: "src/application/selectors/chart-selectors.ts",
      sourceText: 'import "../../adapters/persistence/dexie-game-state-repository";',
    },
    expected: { message: "application files must not import adapter files" },
  },
  {
    name: "rejects domain files importing app shell files",
    extraFile: {
      path: "src/domain/services/resolve-route.ts",
      sourceText: 'import "../../app/routes/title";',
    },
    expected: { message: "domain files must not import app shell files" },
  },
  {
    name: "rejects application files importing app shell files",
    extraFile: {
      path: "src/application/selectors/title-selectors.ts",
      sourceText: 'import "../../app/routes/title";',
    },
    expected: { message: "application files must not import app shell files" },
  },
  {
    name: "rejects adapter files importing app shell files",
    extraFile: {
      path: "src/adapters/persistence/migrations.ts",
      sourceText: 'import "../../app/routes/run";',
    },
    expected: { message: "adapter files must not import app shell files" },
  },
  {
    name: "rejects domain files importing disallowed infrastructure packages",
    extraFile: {
      path: "src/domain/services/resolve-event.ts",
      sourceText: 'import { createRoot } from "react-dom/client";',
    },
    expected: { message: "domain files must not import React DOM" },
  },
  {
    name: "rejects application files importing React",
    extraFile: {
      path: "src/application/selectors/render-selector.ts",
      sourceText: 'import { useMemo } from "react";',
    },
    expected: { message: "application files must not import React" },
  },
  {
    name: "checks dynamic import expressions as imports",
    extraFile: {
      path: "src/domain/services/lazy-load-save.ts",
      sourceText: [
        "export async function loadSaveAdapter() {",
        '  return await import("../../adapters/persistence/dexie-game-state-repository");',
        "}",
      ].join("\n"),
    },
    expected: { message: "domain files must not import adapter files", line: 2 },
  },
  {
    name: "checks no-substitution template dynamic imports as imports",
    extraFile: {
      path: "src/domain/services/lazy-load-save.ts",
      sourceText: [
        "export async function loadSaveAdapter() {",
        "  return await import(`../../adapters/persistence/dexie-game-state-repository`);",
        "}",
      ].join("\n"),
    },
    expected: { message: "domain files must not import adapter files" },
  },
  {
    name: "rejects substitution template dynamic imports in guarded layers",
    extraFile: {
      path: "src/domain/services/lazy-load-save.ts",
      sourceText: [
        "export async function loadSaveAdapter(name: string) {",
        "  return await import(`../../adapters/${" + "name}`);",
        "}",
      ].join("\n"),
    },
    expected: {
      importPath: "__NON_LITERAL_DYNAMIC_IMPORT__",
      message: "domain files must not use non-literal dynamic imports",
    },
  },
  {
    name: "rejects domain dynamic imports that do not use literal module specifiers",
    extraFile: {
      path: "src/domain/services/lazy-load-save.ts",
      sourceText: [
        "export async function loadSaveAdapter(modulePath: string) {",
        "  return await import(modulePath);",
        "}",
      ].join("\n"),
    },
    expected: {
      importPath: "__NON_LITERAL_DYNAMIC_IMPORT__",
      message: "domain files must not use non-literal dynamic imports",
    },
  },
  {
    name: "rejects application dynamic imports that do not use literal module specifiers",
    extraFile: {
      path: "src/application/selectors/lazy-chart.ts",
      sourceText: [
        "export async function loadChart(modulePath: string) {",
        "  return await import(modulePath);",
        "}",
      ].join("\n"),
    },
    expected: {
      importPath: "__NON_LITERAL_DYNAMIC_IMPORT__",
      message: "application files must not use non-literal dynamic imports",
    },
  },
  {
    name: "checks re-export declarations as imports",
    extraFile: {
      path: "src/domain/index.ts",
      sourceText: 'export { selectDashboard } from "../application/selectors/dashboard-selectors";',
    },
    expected: { importPath: "../application/selectors/dashboard-selectors" },
  },
  {
    name: "checks import type queries as imports",
    extraFile: {
      path: "src/domain/services/adapter-type.ts",
      sourceText:
        'type Repository = import("../../adapters/persistence/dexie-game-state-repository").Repository;',
    },
    expected: { message: "domain files must not import adapter files" },
  },
  {
    name: "resolves relative imports that climb directories",
    extraFile: {
      path: "src/domain/rules/debt.ts",
      sourceText: 'import "../../adapters/persistence/migrations";',
    },
    expected: { message: "domain files must not import adapter files" },
  },
];
