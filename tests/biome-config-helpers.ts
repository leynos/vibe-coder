/**
 * @file Helpers for reading Biome JSONC configuration in tests.
 */

import * as v from "valibot";

export interface RestrictedImportPattern {
  readonly group: readonly string[];
  readonly message: string;
}

/**
 * Biome `noRestrictedImports` rule shape used by boundary tests.
 */
export interface NoRestrictedImportsRule {
  readonly level: "error" | "warn" | "info";
  readonly options: {
    readonly patterns?: readonly RestrictedImportPattern[] | undefined;
    readonly paths?: Record<string, string> | undefined;
  };
}

/**
 * A single Biome override entry with include globs and optional linter rules.
 */
export interface BiomeOverride {
  readonly includes?: readonly string[] | undefined;
  readonly linter?:
    | {
        readonly rules?:
          | {
              readonly style?:
                | {
                    readonly noRestrictedImports?: NoRestrictedImportsRule | undefined;
                  }
                | undefined;
            }
          | undefined;
      }
    | undefined;
}

/**
 * Top-level Biome configuration subset read by boundary tests.
 */
export interface BiomeConfig {
  readonly $schema?: string | undefined;
  readonly overrides?: readonly BiomeOverride[] | undefined;
}

const STRING_ARRAY = v.array(v.string());
const STRING_RECORD = v.record(v.string(), v.string());

const RestrictedImportPatternSchema = v.object({
  group: STRING_ARRAY,
  message: v.string(),
});

const RESTRICTED_IMPORT_PATTERNS = v.array(RestrictedImportPatternSchema);

const NoRestrictedImportsRuleSchema = v.object({
  level: v.picklist(["error", "warn", "info"]),
  options: v.object({
    patterns: v.optional(RESTRICTED_IMPORT_PATTERNS),
    paths: v.optional(STRING_RECORD),
  }),
});

const StyleRulesSchema = v.object({
  noRestrictedImports: v.optional(NoRestrictedImportsRuleSchema),
});

const LinterRulesSchema = v.object({
  style: v.optional(StyleRulesSchema),
});

const LinterSchema = v.object({
  rules: v.optional(LinterRulesSchema),
});

const BiomeOverrideSchema = v.object({
  includes: v.optional(STRING_ARRAY),
  linter: v.optional(LinterSchema),
});

const BIOME_OVERRIDES = v.array(BiomeOverrideSchema);

const BiomeConfigSchema = v.object({
  $schema: v.optional(v.string()),
  overrides: v.optional(BIOME_OVERRIDES),
});

/**
 * Remove JSONC line and block comments while preserving string contents.
 *
 * @param text - JSONC source, possibly containing `//` and block comments.
 * @returns JSON text with comments removed.
 * @throws {SyntaxError} If a block comment is not terminated.
 *
 * @example
 * ```ts
 * stripJsonComments('{ "value": true } // trailing');
 * // '{ "value": true } '
 * ```
 */
export function stripJsonComments(text: string): string {
  let output = "";
  let isInString = false;
  let isEscaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (isInString) {
      output += character;
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === '"') {
        isInString = false;
      }
      continue;
    }

    if (character === '"') {
      isInString = true;
      output += character;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      index = skipLineComment(text, index + 2);
      output += "\n";
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      index = skipBlockComment(text, index + 2);
      continue;
    }

    output += character;
  }

  return output;
}

/**
 * Parse a Biome JSONC configuration string into the inspected shape.
 *
 * @param text - JSONC source for a Biome configuration file.
 * @returns The validated subset of the Biome configuration these tests use.
 * @throws {valibot.ValiError} If the parsed configuration has an unexpected
 *   shape.
 *
 * @example
 * ```ts
 * parseJsonc('{ "overrides": [] }');
 * // { overrides: [] }
 * ```
 */
export function parseJsonc(text: string): BiomeConfig {
  return v.parse(BiomeConfigSchema, JSON.parse(stripJsonComments(text)));
}

/**
 * Read and parse a Biome JSONC configuration file from disk.
 *
 * This helper reads with `Bun.file`, parses comments through {@link parseJsonc},
 * and returns the small {@link BiomeConfig} shape the boundary tests inspect.
 *
 * @param path - Configuration path to read. Defaults to the repository
 *   `biome.jsonc`.
 * @returns The parsed Biome configuration shape used by these tests.
 *
 * @example
 * ```ts
 * const config = await readBiomeConfig();
 * // { overrides: [...] }
 *
 * const fixtureConfig = await readBiomeConfig("tmp/biome.jsonc");
 * // { overrides: [...] }
 * ```
 */
export async function readBiomeConfig(path = "biome.jsonc"): Promise<BiomeConfig> {
  return parseJsonc(await Bun.file(path).text());
}

/**
 * Retrieve the `noRestrictedImports` rule for one override include pattern.
 *
 * The function finds the override with the matching `include` value and returns
 * its `linter.rules.style.noRestrictedImports` rule.
 *
 * @param config - Parsed Biome configuration to inspect.
 * @param include - Include glob for the override, such as `src/domain/**`.
 * @returns The configured `noRestrictedImports` rule.
 * @throws {Error} If the matching override or rule is missing.
 *
 * @example
 * ```ts
 * const rule = getNoRestrictedImportsOverride(config, "src/domain/**");
 * // { level: "error", options: { patterns: [...], paths: {...} } }
 * ```
 */
export function getNoRestrictedImportsOverride(
  config: BiomeConfig,
  include: string,
): NoRestrictedImportsRule {
  const override = config.overrides?.find((entry) => entry.includes?.includes(include));
  const rule = override?.linter?.rules?.style?.noRestrictedImports;

  if (!rule) {
    throw new Error(`Missing noRestrictedImports override for ${include}`);
  }

  return rule;
}

/**
 * Skip a `//` JSONC comment and return the newline or EOF index.
 *
 * @param text - Source text being parsed by {@link stripJsonComments}.
 * @param startIndex - Index immediately after the opening `//`.
 * @returns The index of the newline that ended the comment, or EOF.
 */
function skipLineComment(text: string, startIndex: number): number {
  let index = startIndex;
  while (index < text.length && text[index] !== "\n") {
    index += 1;
  }
  return index;
}

/**
 * Skip a `/* ... *\/` JSONC comment, rejecting comments that run to EOF.
 *
 * @param text - Source text being parsed by {@link stripJsonComments}.
 * @param startIndex - Index immediately after the opening `/*`.
 * @returns The index of the closing `/` in the block-comment terminator.
 * @throws {SyntaxError} If no closing block-comment terminator is found.
 */
function skipBlockComment(text: string, startIndex: number): number {
  let index = startIndex;
  while (index < text.length) {
    if (index + 1 < text.length && text[index] === "*" && text[index + 1] === "/") {
      return index + 1;
    }
    index += 1;
  }

  throw new SyntaxError("Unterminated block comment");
}
