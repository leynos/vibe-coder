/**
 * @file End-to-end tests for Biome import-boundary restrictions.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { type BiomeConfig, parseJsonc } from "./biome-config-helpers";

const FIXTURE_ROOT = "tmp/biome-boundary-check";
const BOUNDARY_LAYER_PATTERNS = ["src/domain/**", "src/application/**"] as const;
const RESTRICTED_PACKAGE_FIXTURES = [
  {
    file: "src/domain/forbidden-react.ts",
    importPath: "react",
    message: "Domain must not import React.",
  },
  {
    file: "src/domain/forbidden-react-dom-client.ts",
    importPath: "react-dom/client",
    message: "Domain must not import React DOM.",
  },
  {
    file: "src/domain/forbidden-dexie.ts",
    importPath: "dexie",
    message: "Domain must not import Dexie.",
  },
  {
    file: "src/application/forbidden-react.ts",
    importPath: "react",
    message: "Application must not import React.",
  },
  {
    file: "src/application/forbidden-react-dom-client.ts",
    importPath: "react-dom/client",
    message: "Application must not import React DOM.",
  },
  {
    file: "src/application/forbidden-dexie.ts",
    importPath: "dexie",
    message: "Application must not import Dexie.",
  },
] as const;

describe("Biome noRestrictedImports boundary enforcement", () => {
  afterEach(() => {
    rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  });

  it("rejects forbidden layer imports without matching unrelated packages", async () => {
    mkdirSync(join(FIXTURE_ROOT, "src/domain"), { recursive: true });
    mkdirSync(join(FIXTURE_ROOT, "src/application"), { recursive: true });
    writeFileSync(join(FIXTURE_ROOT, "biome.jsonc"), buildFixtureBiomeConfig());
    writeFileSync(
      join(FIXTURE_ROOT, "src/domain/forbidden-by-alias.ts"),
      'import "@adapters/persistence/db";\n',
    );
    writeFileSync(
      join(FIXTURE_ROOT, "src/application/forbidden-by-src-path.ts"),
      'import "src/adapters/audio/x";\n',
    );
    writeFileSync(
      join(FIXTURE_ROOT, "src/domain/forbidden-by-relative-adapter.ts"),
      'import "../adapters/audio/x";\n',
    );
    mkdirSync(join(FIXTURE_ROOT, "src/domain/rules"), { recursive: true });
    writeFileSync(
      join(FIXTURE_ROOT, "src/domain/rules/forbidden-by-deep-relative-application.ts"),
      'import "../../application/commands/x";\n',
    );
    for (const fixture of RESTRICTED_PACKAGE_FIXTURES) {
      writeFileSync(join(FIXTURE_ROOT, fixture.file), `import "${fixture.importPath}";\n`);
    }
    writeFileSync(join(FIXTURE_ROOT, "src/domain/other.ts"), "export const other = 1;\n");
    writeFileSync(join(FIXTURE_ROOT, "src/domain/allowed.ts"), 'import "./other";\n');
    writeFileSync(
      join(FIXTURE_ROOT, "src/domain/third-party-name-collision.ts"),
      'import "some-pkg-with-adapters-in-name";\n',
    );

    const result = Bun.spawnSync(["bun", "biome", "lint", "--reporter=json", "src"], {
      cwd: FIXTURE_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    const report = JSON.parse(result.stdout.toString()) as BiomeJsonReport;
    const diagnostics = report.diagnostics.map((diagnostic) => ({
      file: getDiagnosticPath(diagnostic),
      message: diagnostic.message,
    }));

    expect(diagnostics).toHaveLength(10);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        {
          file: "src/domain/forbidden-by-alias.ts",
          message: expect.stringContaining("Domain must not depend on adapters or application."),
        },
        {
          file: "src/application/forbidden-by-src-path.ts",
          message: expect.stringContaining("Application must not depend on adapters."),
        },
        {
          file: "src/domain/forbidden-by-relative-adapter.ts",
          message: expect.stringContaining("Domain must not depend on adapters or application."),
        },
        {
          file: "src/domain/rules/forbidden-by-deep-relative-application.ts",
          message: expect.stringContaining("Domain must not depend on adapters or application."),
        },
        ...RESTRICTED_PACKAGE_FIXTURES.map((fixture) => ({
          file: fixture.file,
          message: expect.stringContaining(fixture.message),
        })),
      ]),
    );
    expect(diagnostics.some((diagnostic) => diagnostic.file === "src/domain/allowed.ts")).toBe(
      false,
    );
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.file === "src/domain/third-party-name-collision.ts",
      ),
    ).toBe(false);
  });
});

interface BiomeJsonReport {
  readonly diagnostics: ReadonlyArray<{
    readonly description: string;
    readonly message: string;
    readonly location?: {
      readonly path?: string | { readonly file?: string };
    };
  }>;
}

/**
 * Extract the file path from one Biome JSON diagnostic.
 *
 * @param diagnostic - Diagnostic emitted by `biome lint --reporter=json`.
 * @returns The repository-relative fixture path when Biome reports one.
 */
function getDiagnosticPath(diagnostic: BiomeJsonReport["diagnostics"][number]): string | undefined {
  const path = diagnostic.location?.path;
  return typeof path === "string" ? path : path?.file;
}

/**
 * Build a fixture-local Biome config that keeps only the boundary overrides.
 *
 * @returns A JSON config string rooted at the temporary fixture tree.
 */
function buildFixtureBiomeConfig(): string {
  const config = parseJsonc(readFileSync("biome.jsonc", "utf8")) as BiomeConfig & {
    readonly $schema?: string;
  };

  return `${JSON.stringify(
    {
      $schema: config.$schema,
      files: {
        includes: ["src/**/*"],
        ignoreUnknown: true,
      },
      linter: {
        enabled: true,
        rules: {
          recommended: false,
        },
      },
      overrides: config.overrides?.filter((override) =>
        override.includes?.some((include) =>
          BOUNDARY_LAYER_PATTERNS.includes(include as (typeof BOUNDARY_LAYER_PATTERNS)[number]),
        ),
      ),
    },
    null,
    2,
  )}\n`;
}
