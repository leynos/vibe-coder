/**
 * @file Tests for runtime environment detection.
 *
 * The bootstrap entry point skips its DOM mount under the test runner. These
 * tests pin the probe's tolerance for missing `process` shims and for shims
 * that omit `env`, without mutating the real global object.
 */

import { describe, expect, it } from "bun:test";

import { type EnvironmentHost, isTestEnvironment } from "../src/app/dom/runtime-environment";

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
    // Bun's test runner sets NODE_ENV=test before loading test files, so the
    // default probe must observe it without being passed a host.
    expect(isTestEnvironment()).toBe(true);
  });
});
