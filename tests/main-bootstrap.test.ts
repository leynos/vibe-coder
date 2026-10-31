/**
 * @file Contract tests for the SPA bootstrap branch in `src/main.tsx`.
 *
 * The mount branch only runs outside a test environment, so these cases load
 * the entry point in a child process with a controlled `document`. That keeps
 * the real module graph (i18n, React root, CSS import) in play without
 * mounting into the Happy DOM window used by the rest of the suite.
 */

import { describe, expect, it } from "bun:test";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const MAIN_URL = path.join(REPO_ROOT, "src/main.tsx");
const TIMEOUT_MS = 15_000;

/** Build a child script that imports the entry point after applying `setup`. */
function bootstrapScript(setup: string): string {
  return `
delete process.env.NODE_ENV;
globalThis.fetch = () => new Promise(() => {});
${setup}
try {
  await import(${JSON.stringify(MAIN_URL)});
  console.log("imported");
} catch (error) {
  console.log("error:" + error.message);
}
`;
}

/** Run one bootstrap script and return its combined output. */
function runBootstrap(setup: string): string {
  const result = Bun.spawnSync([process.execPath, "-e", bootstrapScript(setup)], {
    cwd: REPO_ROOT,
    env: { ...process.env },
    timeout: TIMEOUT_MS,
    stdout: "pipe",
    stderr: "pipe",
  });

  return `${result.stdout.toString()}${result.stderr.toString()}`;
}

describe("SPA bootstrap", () => {
  it("reports a missing document body before touching it", () => {
    const output = runBootstrap("globalThis.document = { body: null };");

    expect(output).toContain("error:A document body is required to render the SPA.");
  });

  it("reports a missing mount point with an actionable message", () => {
    const output = runBootstrap(`
globalThis.HTMLElement = class {};
globalThis.document = {
  body: { children: { namedItem: () => null } },
};
`);

    expect(output).toContain("error:Mount point '#root' is required to render the SPA.");
  });

  it("skips mounting when NODE_ENV marks a test environment", () => {
    const result = Bun.spawnSync(
      [
        process.execPath,
        "-e",
        `
process.env.NODE_ENV = "test";
globalThis.fetch = () => new Promise(() => {});
await import(${JSON.stringify(MAIN_URL)});
console.log("imported");
`,
      ],
      {
        cwd: REPO_ROOT,
        env: { ...process.env },
        timeout: TIMEOUT_MS,
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    expect(result.stdout.toString()).toContain("imported");
    expect(result.exitCode).toBe(0);
  });
});
