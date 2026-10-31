/**
 * @file Contract tests for the Playwright configuration's URL handling.
 *
 * Evaluates the configuration in child processes so each test observes a
 * clean environment. The web server probe is skipped, which keeps the tests
 * focused on port and base-URL resolution rather than on process management.
 */

import { describe, expect, it } from "bun:test";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const CONFIG_URL = path.join(REPO_ROOT, "playwright.config.ts");

const READ_CONFIG_SCRIPT = `
const { resolvePort } = await import(${JSON.stringify(CONFIG_URL)});
const config = (await import(${JSON.stringify(CONFIG_URL)})).default;
console.log(JSON.stringify({
  baseURL: config.use.baseURL,
  webServer: config.webServer ?? null,
  ports: {
    explicit: resolvePort(new URL("http://127.0.0.1:8080")),
    httpDefault: resolvePort(new URL("http://example.test")),
    httpsDefault: resolvePort(new URL("https://example.test")),
    httpsExplicit: resolvePort(new URL("https://example.test:8443")),
  },
}));
`;

type ConfigSnapshot = {
  baseURL: string;
  webServer: { command: string } | null;
  ports: {
    explicit: number;
    httpDefault: number;
    httpsDefault: number;
    httpsExplicit: number;
  };
};

/** Evaluate the configuration with the web server probe skipped. */
function readConfig(baseURL?: string): ConfigSnapshot {
  // Start from a copy without any inherited base URL so the default case
  // exercises the configuration's own fallback rather than the parent's.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "PLAYWRIGHT_BASE_URL"),
  );
  Object.assign(env, { PLAYWRIGHT_SKIP_WEBSERVER: "1" });
  if (baseURL !== undefined) {
    Object.assign(env, { PLAYWRIGHT_BASE_URL: baseURL });
  }

  const result = Bun.spawnSync([process.execPath, "-e", READ_CONFIG_SCRIPT], {
    cwd: REPO_ROOT,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Playwright config evaluation failed: ${result.stderr.toString()}`);
  }

  // SAFETY: the child script serialises the snapshot it builds from this
  // repository's own Playwright config; the assertions below fail if the
  // shape or values drift.
  return JSON.parse(result.stdout.toString()) as ConfigSnapshot;
}

describe("Playwright base URL resolution", () => {
  it("uses the local development default when no base URL is configured", () => {
    const config = readConfig();

    expect(config.baseURL).toBe("http://localhost:5173/");
    expect(config.webServer).toBeNull();
  });

  it("preserves an explicit base URL and its port", () => {
    const config = readConfig("http://127.0.0.1:4321/app/");

    expect(config.baseURL).toBe("http://127.0.0.1:4321/app/");
  });
});

describe("Playwright port resolution", () => {
  it("prefers an explicit port over the protocol default", () => {
    const { ports } = readConfig();

    expect(ports.explicit).toBe(8080);
    expect(ports.httpsExplicit).toBe(8443);
  });

  it("falls back to the protocol default when the URL omits a port", () => {
    const { ports } = readConfig();

    expect(ports.httpDefault).toBe(80);
    expect(ports.httpsDefault).toBe(443);
  });
});
