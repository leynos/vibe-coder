/**
 * @file Shared TypeScript path aliases for tooling and runtime configuration.
 *
 * This module is the single source of truth for the hexagonal layer aliases.
 * It defines branded alias and repository-path types for compile-time safety
 * and exports the frozen `PATH_ALIASES` mapping for `@domain`, `@application`,
 * and `@adapters`. The TypeScript config, Vite config, and import-boundary
 * enforcement all derive their local path maps from this list.
 *
 * @example
 * ```ts
 * import { PATH_ALIASES } from "./tools/path-aliases";
 *
 * const tsconfigPaths = Object.fromEntries(
 *   PATH_ALIASES.map(([prefix, target]) => [`${prefix}/*`, [`./${target}/*`]]),
 * );
 * // { "@domain/*": ["./src/domain/*"], ... }
 * ```
 */

export type AliasPrefix = `@${string}` & {
  readonly __brand: "AliasPrefix";
};

export type RepoRelativePath = `src/${string}` & {
  readonly __brand: "RepoRelativePath";
};

export type AliasEntry = readonly [AliasPrefix, RepoRelativePath];

const aliasPrefix = (value: `@${string}`): AliasPrefix => value as AliasPrefix;
const repoRelativePath = (value: `src/${string}`): RepoRelativePath => value as RepoRelativePath;

export const PATH_ALIASES = Object.freeze([
  [aliasPrefix("@domain"), repoRelativePath("src/domain")],
  [aliasPrefix("@application"), repoRelativePath("src/application")],
  [aliasPrefix("@adapters"), repoRelativePath("src/adapters")],
] as const satisfies readonly AliasEntry[]);
