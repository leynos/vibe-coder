/**
 * @file Behavioural tests for the TypeDoc documentation gate.
 *
 * The wiring contract in `docs-gate.config.test.ts` proves the gate is
 * invoked; these tests prove it decides correctly. Each one runs the real
 * TypeDoc binary under the repository's own `typedoc.json`, redirected at a
 * throwaway project, and asserts the exit status, the named symbol, and that
 * nothing was written to disk.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** Generous because TypeDoc loads the TypeScript compiler on every run. */
const GATE_TIMEOUT_MS = 120_000;

const TYPEDOC_BINARY = resolve("node_modules/typedoc/bin/typedoc");

interface GateResult {
  exitCode: number;
  output: string;
  emitted: readonly string[];
}

let projectRoot: string;

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), "vibe-coder-docs-gate-"));
  mkdirSync(join(projectRoot, "src"));
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
});

/**
 * Run the repository's TypeDoc configuration against a throwaway project.
 *
 * The validation policy, `emit`, `requiredToBeDocumented` and `blockTags` all
 * come from the repository's own `typedoc.json`; only the entry points and the
 * compiler view are redirected. A copy of the policy would drift from the
 * gate and the test would stop describing it.
 *
 * @param source - Contents of the fixture's single module.
 * @returns The gate's exit status, its combined output, and the names of any
 *   files it left behind beyond the fixture itself.
 *
 * @example
 * ```ts
 * const result = await runGate("export const answer = 42;");
 * // result.exitCode === 4, result.output names `answer`.
 * ```
 */
async function runGate(source: string): Promise<GateResult> {
  const repositoryConfig = (await Bun.file("typedoc.json").json()) as Record<string, unknown>;
  const fixtureConfig = {
    ...repositoryConfig,
    tsconfig: "./tsconfig.json",
    entryPoints: ["src"],
  };

  await Bun.write(join(projectRoot, "src/fixture.ts"), source);
  await Bun.write(
    join(projectRoot, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "es2022",
        module: "esnext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
      include: ["src"],
    }),
  );
  await Bun.write(join(projectRoot, "typedoc.json"), JSON.stringify(fixtureConfig));
  // TypeDoc resolves a symbol's owning package from the nearest package.json.
  // Without one it cannot tell whether a referenced type belongs to the
  // documented package, and the `notExported` validation never fires.
  await Bun.write(
    join(projectRoot, "package.json"),
    JSON.stringify({ name: "docs-gate-fixture", version: "0.0.0", private: true, type: "module" }),
  );

  const before = new Set(readdirSync(projectRoot));
  const process = Bun.spawn([TYPEDOC_BINARY, "--options", "typedoc.json"], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  return {
    exitCode,
    output: `${stdout}${stderr}`,
    emitted: readdirSync(projectRoot).filter((entry) => !before.has(entry)),
  };
}

describe("TypeDoc documentation gate behaviour", () => {
  it(
    "passes a documented surface in the repository's house style without writing anything",
    async () => {
      const result = await runGate(
        [
          "/**",
          " * @file Fixture module header in the repository's house style.",
          " * @module",
          " */",
          "",
          "/** The answer to life, the universe, and everything. */",
          "export const answer = 42;",
          "",
        ].join("\n"),
      );

      // `@file` is not a TypeDoc tag; the gate accepts it only because
      // `typedoc.json` registers it in `blockTags`.
      expect(result.output).not.toContain("unknown block tag");
      expect(result.output).not.toContain("warning");
      expect(result.exitCode).toBe(0);
      expect(result.emitted).toEqual([]);
    },
    GATE_TIMEOUT_MS,
  );

  it(
    "fails an undocumented export and names the symbol",
    async () => {
      const result = await runGate("export const answer = 42;\n");

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("answer");
      expect(result.output).toContain("does not have any documentation");
      expect(result.emitted).toEqual([]);
    },
    GATE_TIMEOUT_MS,
  );

  it(
    "fails a type that an exported signature refers to but does not export",
    async () => {
      const result = await runGate(
        [
          "/** Shape returned by the fixture. */",
          "interface Hidden {",
          "  /** Whatever the fixture computed. */",
          "  value: number;",
          "}",
          "",
          "/** Returns the hidden shape. */",
          "export function compute(): Hidden {",
          "  return { value: 42 };",
          "}",
          "",
        ].join("\n"),
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("Hidden");
      expect(result.output).toContain("not included in the documentation");
      expect(result.emitted).toEqual([]);
    },
    GATE_TIMEOUT_MS,
  );

  it(
    "fails an unresolvable link in a documentation comment",
    async () => {
      const result = await runGate(
        "/** See {@link NoSuchSymbol} for details. */\nexport const answer = 42;\n",
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.output).toContain("NoSuchSymbol");
      expect(result.emitted).toEqual([]);
    },
    GATE_TIMEOUT_MS,
  );
});
