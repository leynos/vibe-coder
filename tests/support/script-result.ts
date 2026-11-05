/** @file Result shape returned by tests that spawn a repository script. */

/**
 * Captured outcome of a spawned script.
 *
 * Tests assert on the exit code and on the diagnostics the script wrote, so
 * both streams are decoded to text as soon as the process exits.
 */
export type ScriptResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};
