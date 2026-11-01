/** @file Detection of the runtime environment without assuming a Node shim. */

/** Environment key that marks the test runner, named so the lookup stays typed. */
const NODE_ENV_KEY = "NODE_ENV";

/**
 * The slice of a `process`-like host needed to read `NODE_ENV`.
 *
 * Each level is optional because the browser bundle has no `process` at all
 * and some bundlers install a shim without an `env` object.
 */
export interface EnvironmentHost {
  /** Node-style process handle; absent in a browser bundle without a shim. */
  readonly process?: {
    /**
     * Environment map. Recorded as an index signature because that is the
     * shape Node and Bun declare, so the real global object is assignable.
     */
    readonly env?: Readonly<Record<string, string | undefined>>;
  };
}

/**
 * Return `true` when `NODE_ENV` marks a test environment.
 *
 * The entry point uses this to skip its DOM bootstrap under the test runner.
 * Both `process` and `process.env` are probed rather than assumed: a bundler
 * can shim `process` without providing `env`, and the Node type declarations
 * describe neither runtime as optional.
 *
 * @param host - Object that may expose `process.env.NODE_ENV`; defaults to the
 * current global object.
 * @returns Whether the host reports the `"test"` environment.
 *
 * @example
 * ```ts
 * isTestEnvironment({ process: { env: { NODE_ENV: "test" } } }); // true
 * isTestEnvironment({ process: {} }); // false, not a TypeError
 * isTestEnvironment({}); // false
 * ```
 */
export function isTestEnvironment(host: EnvironmentHost = globalThis): boolean {
  // The environment map is an index signature, so `noPropertyAccessFromIndexSignature`
  // requires bracket access. A named key keeps that access out of the
  // literal-key lint rule as well.
  return host.process?.env?.[NODE_ENV_KEY] === "test";
}
