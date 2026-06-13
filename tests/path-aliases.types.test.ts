/**
 * @file Compile-time contracts for branded path-alias types.
 *
 * TypeScript does not use Rust's `trybuild`; these `@ts-expect-error`
 * assertions provide the equivalent compile-fail coverage through `tsc`.
 */

import { describe, expect, it } from "bun:test";

import {
  type AliasEntry,
  type AliasPrefix,
  PATH_ALIASES,
  type RepoRelativePath,
} from "../tools/path-aliases";

describe("path alias compile-time contracts", () => {
  it("keeps exported path aliases assignable as branded entries", () => {
    for (const entry of PATH_ALIASES) {
      acceptAliasEntry(entry);
    }

    expect(PATH_ALIASES).toHaveLength(3);
  });
});

/** Accept only a branded alias prefix. */
function acceptAliasPrefix(_value: AliasPrefix): void {}

/** Accept only a branded repository-relative path. */
function acceptRepoRelativePath(_value: RepoRelativePath): void {}

/** Accept only a branded alias tuple. */
function acceptAliasEntry(_value: AliasEntry): void {}

// @ts-expect-error: plain strings must not satisfy branded alias prefixes.
acceptAliasPrefix("@domain");

// @ts-expect-error: repository paths must stay rooted under src/.
acceptRepoRelativePath("domain/model");

// @ts-expect-error: plain tuples must not bypass the branded alias tuple.
acceptAliasEntry(["@domain", "src/domain"]);
