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
import { violationCases } from "./import-boundary-violation-cases";

const BASE_PATH = "/project";
const CHECK_OPTIONS = { basePath: BASE_PATH } as const;

describe("classifySourcePath", () => {
  it("classifies source paths by architectural layer", () => {
    expect(classifySourcePath("src/domain/index.ts", CHECK_OPTIONS)).toBe("domain");
    expect(classifySourcePath("src/application/index.ts", CHECK_OPTIONS)).toBe("application");
    expect(classifySourcePath("src/adapters/index.ts", CHECK_OPTIONS)).toBe("adapters");
    expect(classifySourcePath("src/app/app.tsx", CHECK_OPTIONS)).toBe("app");
    expect(classifySourcePath("src/main.tsx", CHECK_OPTIONS)).toBe("other");
    expect(classifySourcePath("/project/src/domain/index.ts", CHECK_OPTIONS)).toBe("domain");
    expect(classifySourcePath("/project/src/adapters/index.ts", CHECK_OPTIONS)).toBe("adapters");
  });
});

describe("findBoundaryViolations", () => {
  const files = [
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
    ["domain to domain", "src/domain/services/apply-policy.ts", 'import "../model/run-state";'],
    [
      "application to domain",
      "src/application/selectors/risk-selectors.ts",
      'import "../../domain/model/run-state";',
    ],
    [
      "application to application",
      "src/application/services/build-dashboard.ts",
      'import "../selectors/dashboard-selectors";',
    ],
    [
      "adapter to application and domain",
      "src/adapters/persistence/migrations.ts",
      [
        'import "../../application/selectors/dashboard-selectors";',
        'import "../../domain/model/run-state";',
      ].join("\n"),
    ],
    [
      "adapter to adapter",
      "src/adapters/persistence/migrations.ts",
      'import "./dexie-game-state-repository";',
    ],
    [
      "app shell to every architectural layer",
      "src/app/routes/run.tsx",
      [
        'import "../../adapters/persistence/dexie-game-state-repository";',
        'import "../../application/selectors/dashboard-selectors";',
        'import "../../domain/model/run-state";',
      ].join("\n"),
    ],
  ] as const;

  it.each(allowedCases)("allows %s imports", (_label, path, sourceText) => {
    const violations = findBoundaryViolations(
      [...files, buildFile(path, sourceText)],
      CHECK_OPTIONS,
    );

    expect(violations).toEqual([]);
  });

  for (const { name, extraFile, expected } of violationCases) {
    it(name, () => {
      const violations = findViolationsWith(buildFile(extraFile.path, extraFile.sourceText));

      expect(violations).toHaveLength(1);
      expectViolation(violations[0], expected);
    });
  }

  it("reports multiple violations from one source file in import order", () => {
    const violations = findViolationsWith(
      buildFile(
        "src/domain/services/collect-dependencies.ts",
        [
          'import "../../application/selectors/dashboard-selectors";',
          'import "../../adapters/persistence/dexie-game-state-repository";',
        ].join("\n"),
      ),
    );

    expect(violations.map(({ importPath, message }) => ({ importPath, message }))).toEqual([
      {
        importPath: "../../application/selectors/dashboard-selectors",
        message: "domain files must not import application files",
      },
      {
        importPath: "../../adapters/persistence/dexie-game-state-repository",
        message: "domain files must not import adapter files",
      },
    ]);
  });

  function findViolationsWith(extraFile: SourceFileInput): ReadonlyArray<BoundaryViolation> {
    return findBoundaryViolations([...files, extraFile], CHECK_OPTIONS);
  }
});

describe("layer matrix", () => {
  const layerFiles = {
    domain: "src/domain/model/run-state.ts",
    application: "src/application/selectors/dashboard-selectors.ts",
    adapters: "src/adapters/persistence/dexie-game-state-repository.ts",
    app: "src/app/routes/title.tsx",
    other: "src/main.tsx",
  } as const;
  const layerImports = {
    domain: "src/domain/model/run-state",
    application: "src/application/selectors/dashboard-selectors",
    adapters: "src/adapters/persistence/dexie-game-state-repository",
    app: "src/app/routes/title",
    other: "src/main",
  } as const;
  const layers = Object.keys(layerFiles) as ReadonlyArray<keyof typeof layerFiles>;

  it("exhaustively enforces every source and target layer pair", () => {
    for (const sourceLayer of layers) {
      for (const targetLayer of layers) {
        const violations = findBoundaryViolations(
          [
            ...layers.map((layer) => buildFile(layerFiles[layer], "export const marker = {};")),
            buildFile(layerFiles[sourceLayer], `import "${layerImports[targetLayer]}";`),
          ],
          CHECK_OPTIONS,
        );

        expect({
          sourceLayer,
          targetLayer,
          messages: violations.map((violation) => violation.message),
        }).toEqual({
          sourceLayer,
          targetLayer,
          messages: expectedLayerMessages(sourceLayer, targetLayer),
        });
      }
    }
  });
});

describe("basePath option", () => {
  it("classifySourcePath respects an explicit basePath", () => {
    expect(classifySourcePath("/project/src/domain/model.ts", CHECK_OPTIONS)).toBe("domain");
    expect(classifySourcePath("/project/src/adapters/http.ts", CHECK_OPTIONS)).toBe("adapters");
  });

  it("findBoundaryViolations detects violations when basePath is supplied", () => {
    const violations = findBoundaryViolations(
      [
        buildFile("/project/src/domain/bad.ts", 'import "../adapters/http";'),
        buildFile("/project/src/adapters/http.ts", "export const http = {};"),
      ],
      CHECK_OPTIONS,
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toBe("domain files must not import adapter files");
  });
});

/**
 * Build a source-file fixture for import-boundary rule tests.
 *
 * @param path - Repository-relative or absolute path used as the source file name.
 * @param sourceText - TypeScript or JavaScript source text for the fixture.
 * @returns A complete {@link SourceFileInput} object.
 *
 * @example
 * ```ts
 * buildFile("src/domain/model.ts", "export const model = {};");
 * // { path: "src/domain/model.ts", sourceText: "export const model = {};" }
 * ```
 */
function buildFile(path: string, sourceText: string): SourceFileInput {
  return { path, sourceText };
}

/**
 * Assert selected fields from a boundary violation.
 *
 * @param violation - The violation returned by {@link findBoundaryViolations}.
 * @param expected - The subset of violation fields relevant to the test case.
 *
 * @example
 * ```ts
 * expectViolation(violations[0], {
 *   message: "domain files must not import adapter files",
 * });
 * ```
 */
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

/**
 * Return expected violations for one source and target layer pair.
 *
 * @param sourceLayer - Architectural layer containing the import statement.
 * @param targetLayer - Architectural layer named by the import target.
 * @returns The expected boundary violation messages for that import direction.
 *
 * @example
 * ```ts
 * expectedLayerMessages("domain", "adapters");
 * // ["domain files must not import adapter files"]
 * ```
 */
function expectedLayerMessages(sourceLayer: string, targetLayer: string): string[] {
  const messagesByLayerPair: Record<string, string[]> = {
    "domain->application": ["domain files must not import application files"],
    "domain->adapters": ["domain files must not import adapter files"],
    "domain->app": ["domain files must not import app shell files"],
    "application->adapters": ["application files must not import adapter files"],
    "application->app": ["application files must not import app shell files"],
    "adapters->app": ["adapter files must not import app shell files"],
  };

  return messagesByLayerPair[`${sourceLayer}->${targetLayer}`] ?? [];
}
