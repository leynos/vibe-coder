/**
 * @file Behavioural tests for the semantic-lint scripts.
 *
 * Each script resolves its configuration and scan root from the working
 * directory, so the tests run the real script in a temporary fixture tree and
 * assert on its exit code and diagnostics.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ScriptResult } from "./support/script-result";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const CLASS_LIST_SCRIPT = path.join(REPO_ROOT, "scripts/check-classlist-length.ts");
const HARDCODED_STRINGS_SCRIPT = path.join(REPO_ROOT, "scripts/check-hardcoded-strings.ts");
const NEAR_DUPLICATE_SCRIPT = path.join(REPO_ROOT, "scripts/find-near-duplicate-classes.ts");
const CONFIG_PATH = "tools/semantic-lint.config.json";

let fixtureRoot = "";

/** Create a temporary project tree for one test. */
beforeEach(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), "vibe-semantic-lint-"));
  writeFixture(CONFIG_PATH, "{}");
});

/** Remove the temporary project tree. */
afterEach(() => {
  rmSync(fixtureRoot, { force: true, recursive: true });
});

/** Write a file inside the fixture tree, creating parent directories. */
function writeFixture(relativePath: string, contents: string): void {
  const target = path.join(fixtureRoot, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

/** Run one semantic-lint script inside the fixture tree. */
function runScript(scriptPath: string): ScriptResult {
  const result = Bun.spawnSync([process.execPath, scriptPath], {
    cwd: fixtureRoot,
    env: { ...process.env },
  });

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

/** Build a JSX module with one `className` attribute. */
function classListModule(utilities: readonly string[]): string {
  return `export function Sample() {\n  return <div className="${utilities.join(" ")}" />;\n}\n`;
}

describe("check-classlist-length", () => {
  it("accepts a class list within the configured limit", () => {
    writeFixture("src/app/sample.tsx", classListModule(["flex", "items-center", "gap-2"]));

    const result = runScript(CLASS_LIST_SCRIPT);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("rejects a class list that exceeds the default limit", () => {
    const utilities = Array.from({ length: 17 }, (_, index) => `u${index}`);
    writeFixture("src/app/sample.tsx", classListModule(utilities));

    const result = runScript(CLASS_LIST_SCRIPT);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("className has 17 utilities (max 16)");
  });

  it("honours a configured limit", () => {
    writeFixture(CONFIG_PATH, JSON.stringify({ maxClasslistLength: 2 }));
    writeFixture("src/app/sample.tsx", classListModule(["flex", "items-center", "gap-2"]));

    const result = runScript(CLASS_LIST_SCRIPT);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("max 2");
  });
});

describe("check-hardcoded-strings", () => {
  it("rejects user-facing JSX text that is not translated", () => {
    writeFixture(
      "src/app/sample.tsx",
      "export function Sample() {\n  return <p>Hello there</p>;\n}\n",
    );

    const result = runScript(HARDCODED_STRINGS_SCRIPT);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("hard-coded JSX text");
  });

  it("accepts JSX text wrapped in t()", () => {
    writeFixture(
      "src/app/sample.tsx",
      'export function Sample() {\n  return <p>{t("hello")}</p>;\n}\n',
    );

    const result = runScript(HARDCODED_STRINGS_SCRIPT);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("ignores regions marked with data-i18n-ignore", () => {
    writeFixture(
      "src/app/sample.tsx",
      "export function Sample() {\n  return <p data-i18n-ignore>Raw text</p>;\n}\n",
    );

    const result = runScript(HARDCODED_STRINGS_SCRIPT);

    expect(result.exitCode).toBe(0);
  });
});

describe("find-near-duplicate-classes", () => {
  it("reports identical class stacks across files", () => {
    writeFixture(CONFIG_PATH, JSON.stringify({ nearDuplicateClasses: { failOnViolation: true } }));
    writeFixture("src/app/one.tsx", classListModule(["flex", "items-center", "gap-2", "p-4"]));
    writeFixture("src/app/two.tsx", classListModule(["flex", "items-center", "gap-2", "p-4"]));

    const result = runScript(NEAR_DUPLICATE_SCRIPT);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Repeated class stack found");
  });

  it("does not fail the build unless failOnViolation is set", () => {
    writeFixture("src/app/one.tsx", classListModule(["flex", "items-center", "gap-2", "p-4"]));
    writeFixture("src/app/two.tsx", classListModule(["flex", "items-center", "gap-2", "p-4"]));

    const result = runScript(NEAR_DUPLICATE_SCRIPT);

    expect(result.exitCode).toBe(0);
  });
});
