/** @file Shared location of the semantic-lint rule configuration. */

/**
 * Path to the semantic-lint configuration, relative to the project root.
 *
 * The semantic lint scripts (`check-classlist-length`,
 * `check-hardcoded-strings`, and `find-near-duplicate-classes`) each read a
 * different section of the same file, so the location is defined once here.
 *
 * @example
 * ```ts
 * readFileSync(SEMANTIC_LINT_CONFIG_PATH, "utf8");
 * ```
 */
export const SEMANTIC_LINT_CONFIG_PATH = "tools/semantic-lint.config.json";
