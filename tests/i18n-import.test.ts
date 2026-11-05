/**
 * @file Guards that importing the i18n module never waits for the network.
 *
 * i18next loads the initial locale bundle during initialization. If the module
 * awaited that promise at top level, importing it would not settle until the
 * fetch did, which would block the application entry point. These cases import
 * the module in child processes with a controlled `fetch`.
 */

import { describe, expect, it } from "bun:test";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const I18N_URL = path.join(REPO_ROOT, "src/i18n.ts");
// Keep this below Bun's default 5 s per-test timeout so a stuck child is
// reported as a spawn timeout rather than an opaque test timeout.
const IMPORT_BUDGET_MS = 4000;
const TEST_TIMEOUT_MS = 15_000;

/** Import the module after installing `fetch` and any extra setup. */
function importScript(fetchImpl: string, afterImport = ""): string {
  return `
globalThis.fetch = ${fetchImpl};
const started = Date.now();
const module = await import(${JSON.stringify(I18N_URL)});
${afterImport}
console.log("imported", Date.now() - started);
// i18next retries a failed locale load five times with 350 ms backoff, so its
// timers would keep the child alive for about 11 s after a rejection. The
// contract under test is that the import itself settles, which has already
// happened by this point.
process.exit(0);
`;
}

/** Run an import script and return the child result. */
function runImport(script: string) {
  return Bun.spawnSync([process.execPath, "-e", script], {
    cwd: REPO_ROOT,
    env: { ...process.env },
    timeout: IMPORT_BUDGET_MS,
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("i18n module import", () => {
  it(
    "settles without waiting for a pending locale bundle fetch",
    () => {
      const result = runImport(importScript("() => new Promise(() => {})"));

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain("imported");
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "settles when the locale bundle fetch fails",
    () => {
      const result = runImport(
        importScript('() => Promise.reject(new TypeError("Failed to fetch"))'),
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain("imported");
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "skips body attributes when the document has no body yet",
    () => {
      const result = runImport(
        importScript(
          "() => new Promise(() => {})",
          `
globalThis.document = {
  documentElement: { lang: "", dir: "", setAttribute() {} },
  body: null,
};
module.applyDocumentLocale("ar");
console.log("locale:" + globalThis.document.documentElement.lang);
`,
        ),
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain("locale:ar");
    },
    TEST_TIMEOUT_MS,
  );
});
