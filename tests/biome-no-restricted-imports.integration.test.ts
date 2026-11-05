/**
 * @file End-to-end tests for Biome import-boundary restrictions.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as v from "valibot";

import { parseJsonc } from "./biome-config-helpers";

const FIXTURE_ROOT = "tmp/biome-boundary-check";
const BOUNDARY_LAYER_PATTERNS = new Set<string>(["src/domain/**", "src/application/**"]);
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
const FORBIDDEN_LAYER_FIXTURES = [
  {
    file: "src/domain/forbidden-by-alias.ts",
    importPath: "@adapters/persistence/db",
    message: "Domain must not depend on adapters or application.",
  },
  {
    file: "src/domain/forbidden-by-bare-adapter-alias.ts",
    importPath: "@adapters",
    message: "Domain must not depend on adapters or application.",
  },
  {
    file: "src/domain/forbidden-by-bare-application-alias.ts",
    importPath: "@application",
    message: "Domain must not depend on adapters or application.",
  },
  {
    file: "src/application/forbidden-by-bare-adapter-alias.ts",
    importPath: "@adapters",
    message: "Application must not depend on adapters.",
  },
] as const;

describe("Biome noRestrictedImports boundary enforcement", () => {
  afterEach(() => {
    rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  });

  it("rejects forbidden layer imports without matching unrelated packages", async () => {
    mkdirSync(path.join(FIXTURE_ROOT, "src/domain"), { recursive: true });
    mkdirSync(path.join(FIXTURE_ROOT, "src/application"), { recursive: true });
    writeFileSync(path.join(FIXTURE_ROOT, "biome.jsonc"), buildFixtureBiomeConfig());
    for (const fixture of FORBIDDEN_LAYER_FIXTURES) {
      writeFileSync(path.join(FIXTURE_ROOT, fixture.file), `import "${fixture.importPath}";\n`);
    }
    writeFileSync(
      path.join(FIXTURE_ROOT, "src/application/forbidden-by-src-path.ts"),
      'import "src/adapters/audio/x";\n',
    );
    writeFileSync(
      path.join(FIXTURE_ROOT, "src/domain/forbidden-by-relative-adapter.ts"),
      'import "../adapters/audio/x";\n',
    );
    mkdirSync(path.join(FIXTURE_ROOT, "src/domain/rules"), { recursive: true });
    writeFileSync(
      path.join(FIXTURE_ROOT, "src/domain/rules/forbidden-by-deep-relative-application.ts"),
      'import "../../application/commands/x";\n',
    );
    for (const fixture of RESTRICTED_PACKAGE_FIXTURES) {
      writeFileSync(path.join(FIXTURE_ROOT, fixture.file), `import "${fixture.importPath}";\n`);
    }
    writeFileSync(path.join(FIXTURE_ROOT, "src/domain/other.ts"), "export const other = 1;\n");
    writeFileSync(path.join(FIXTURE_ROOT, "src/domain/allowed.ts"), 'import "./other";\n');
    writeFileSync(
      path.join(FIXTURE_ROOT, "src/domain/third-party-name-collision.ts"),
      'import "some-pkg-with-adapters-in-name";\n',
    );

    const result = Bun.spawnSync(["bun", "biome", "lint", "--reporter=json", "src"], {
      cwd: FIXTURE_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(result.exitCode).not.toBe(0);
    const report = v.parse(BiomeJsonReportSchema, JSON.parse(result.stdout.toString()));
    const diagnostics = report.diagnostics.map((diagnostic) => ({
      file: diagnostic.location?.path,
      message: diagnostic.message,
    }));

    expect(diagnostics).toHaveLength(13);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
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
        ...FORBIDDEN_LAYER_FIXTURES.map((fixture) => ({
          file: fixture.file,
          message: expect.stringContaining(fixture.message),
        })),
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

const FILE_LOCATION_SCHEMA = v.object({ file: v.optional(v.string()) });
const FILE_PATH_SCHEMA = v.pipe(
  FILE_LOCATION_SCHEMA,
  v.transform((entry) => entry.file),
);
const DiagnosticPathSchema = v.union([v.string(), FILE_PATH_SCHEMA]);

const DiagnosticLocationSchema = v.object({ path: v.optional(DiagnosticPathSchema) });
const DiagnosticSchema = v.object({
  message: v.string(),
  location: v.optional(DiagnosticLocationSchema),
});

const BiomeJsonReportSchema = v.object({ diagnostics: v.array(DiagnosticSchema) });

/**
 * Build a fixture-local Biome config that keeps only the boundary overrides.
 *
 * @returns A JSON config string rooted at the temporary fixture tree.
 */
function buildFixtureBiomeConfig(): string {
  const config = parseJsonc(readFileSync("biome.jsonc", "utf8"));

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
        override.includes?.some((include) => BOUNDARY_LAYER_PATTERNS.has(include)),
      ),
    },
    null,
    2,
  )}\n`;
}
