/**
 * @file Behavioural tests for the Fluent placeholder-parity check.
 *
 * Runs the script against temporary locale trees so the cases cover nested
 * select expressions, missing and extra variables, and the per-message
 * `vars: ignore-mismatch` opt-out.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { ScriptResult } from "./support/script-result";

const SCRIPT_PATH = path.resolve(import.meta.dir, "../scripts/check-fluent-vars.ts");

const NESTED_MESSAGES = [
  "hello = Hello { $name }",
  "count = { $count ->",
  "   [one] One item for { $name }",
  "  *[other] { $count } items for { $name }",
  "}",
  "",
].join("\n");

let fixtureRoot = "";

/** Create a temporary project tree for one test. */
beforeEach(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), "vibe-ftl-vars-"));
});

/** Remove the temporary project tree. */
afterEach(() => {
  rmSync(fixtureRoot, { force: true, recursive: true });
});

/** Write one locale's messages into the fixture tree. */
function writeLocale(locale: string, contents: string): void {
  const target = path.join(fixtureRoot, "public/locales", locale, "common.ftl");
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

/** Run the placeholder check inside the fixture tree. */
function runCheck(): ScriptResult {
  const result = Bun.spawnSync([process.execPath, SCRIPT_PATH], {
    cwd: fixtureRoot,
    env: { ...process.env, FTL_BASE_LOCALE: "en-GB" },
  });

  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

describe("check-fluent-vars", () => {
  it("accepts locales whose placeholders match, including nested selects", () => {
    writeLocale("en-GB", NESTED_MESSAGES);
    writeLocale("cy-GB", NESTED_MESSAGES);

    const result = runCheck();

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("All Fluent placeholders align");
  });

  it("reports a variable that the translation is missing", () => {
    writeLocale("en-GB", NESTED_MESSAGES);
    writeLocale("cy-GB", "hello = Helo\ncount = 0\n");

    const result = runCheck();

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("missing: $name");
  });

  it("reports a variable that the translation adds", () => {
    writeLocale("en-GB", NESTED_MESSAGES);
    writeLocale("cy-GB", "hello = Helo { $name } { $extra }\ncount = 0\n");

    const result = runCheck();

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("extra:   $extra");
  });

  it("skips messages opted out with vars: ignore-mismatch", () => {
    writeLocale("en-GB", "# vars: ignore-mismatch\nhello = Hello { $name }\n");
    writeLocale("cy-GB", "hello = Helo\n");

    const result = runCheck();

    expect(result.exitCode).toBe(0);
  });
});
