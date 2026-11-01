/**
 * @file Tests for runtime environment detection.
 *
 * The bootstrap entry point skips its DOM mount under the test runner. These
 * tests pin the probe's tolerance for missing `process` shims and for shims
 * that omit `env`, without mutating the real global object.
 */

import { describe, expect, it } from "bun:test";
import path from "node:path";

import { type EnvironmentHost, isTestEnvironment } from "../src/app/dom/runtime-environment";

const MODULE_PATH = path.join(import.meta.dir, "..", "src", "app", "dom", "runtime-environment.ts");

/**
 * Run the default-host probe in a child process with `nodeEnv` set.
 *
 * The ambient `NODE_ENV` belongs to whoever started the runner, so a child
 * process supplies a known value instead. That proves the default host is the
 * global object without mutating the environment the rest of the suite sees.
 *
 * @param nodeEnv - Value to export as `NODE_ENV` for the probe.
 * @returns Whether the probe reported the test environment.
 */
function probeWithNodeEnv(nodeEnv: string): boolean {
  const script = `
const { isTestEnvironment } = await import(${JSON.stringify(MODULE_PATH)});
process.stdout.write(String(isTestEnvironment()));
`;
  const result = Bun.spawnSync([process.execPath, "-e", script], {
    env: { ...process.env, NODE_ENV: nodeEnv },
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(`runtime probe failed: ${result.stderr.toString()}`);
  }

  return result.stdout.toString() === "true";
}

describe("isTestEnvironment", () => {
  it("reports a test environment when NODE_ENV is 'test'", () => {
    const host: EnvironmentHost = { process: { env: { NODE_ENV: "test" } } };

    expect(isTestEnvironment(host)).toBe(true);
  });

  it("reports a non-test environment for another known value", () => {
    const host: EnvironmentHost = { process: { env: { NODE_ENV: "production" } } };

    expect(isTestEnvironment(host)).toBe(false);
  });

  it("reports no test environment when process is absent", () => {
    // The browser bundle has no `process` at all, which must not throw.
    expect(isTestEnvironment({})).toBe(false);
  });

  it("reports no test environment when a shim omits env", () => {
    // Some bundlers install a minimal `process` shim without `env`.
    expect(isTestEnvironment({ process: {} })).toBe(false);
  });

  it("reports no test environment when env omits NODE_ENV", () => {
    expect(isTestEnvironment({ process: { env: {} } })).toBe(false);
  });

  it("defaults to probing the current global object", () => {
    expect(probeWithNodeEnv("test")).toBe(true);
    expect(probeWithNodeEnv("production")).toBe(false);
  });
});
