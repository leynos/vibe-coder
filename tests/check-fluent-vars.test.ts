/**
 * @file Behavioural tests for the Fluent placeholder-parity check.
 *
 * Runs the script against temporary locale trees so the cases cover nested
 * select expressions, missing and extra variables, and the per-message
 * `vars: ignore-mismatch` opt-out.
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseResource } from "../scripts/check-fluent-vars";
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

  it("fails when a locale file contains a syntax error", () => {
    writeLocale("en-GB", NESTED_MESSAGES);
    writeLocale("cy-GB", "hello = Helo\nbroken = }\nstill = fine\n");

    const result = runCheck();

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unable to parse");
    expect(result.stderr).toContain("cy-GB/common.ftl");
    expect(result.stderr).toContain("(line 2)");
    expect(result.stderr).not.toContain("All Fluent placeholders align");
  });

  it("fails when the base locale cannot be parsed", () => {
    writeLocale("en-GB", "= broken\n");
    writeLocale("cy-GB", NESTED_MESSAGES);

    const result = runCheck();

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Unable to parse");
    expect(result.stderr).toContain("en-GB/common.ftl");
    expect(result.stderr).toContain("(line 1)");
  });

  it("skips messages opted out with vars: ignore-mismatch", () => {
    writeLocale("en-GB", "# vars: ignore-mismatch\nhello = Hello { $name }\n");
    writeLocale("cy-GB", "hello = Helo\n");

    const result = runCheck();

    expect(result.exitCode).toBe(0);
  });
});

describe("parseResource", () => {
  it("returns the parsed resource for valid Fluent", () => {
    const outcome = parseResource("hello = Hello { $name }\n");

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected a successful parse");
    expect(outcome.resource.body).toHaveLength(1);
  });

  it("returns a syntax failure as data without logging or exiting", () => {
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    const originalExitCode = process.exitCode;

    try {
      const outcome = parseResource("broken = }\n");

      expect(outcome.ok).toBe(false);
      if (outcome.ok) throw new Error("expected a failed parse");
      expect(outcome.reason).toContain("line 1");
      // The parser is a query: reporting belongs to the CLI boundary.
      expect(errorSpy).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(originalExitCode);
    } finally {
      errorSpy.mockRestore();
    }
  });
});
