/**
 * @file Helpers for reading Biome JSONC configuration in tests.
 */

export interface RestrictedImportPattern {
  readonly group: readonly string[];
  readonly message: string;
}

export interface NoRestrictedImportsRule {
  readonly level: "error" | "warn" | "info";
  readonly options: {
    readonly patterns?: readonly RestrictedImportPattern[];
    readonly paths?: Record<string, string>;
  };
}

export interface BiomeOverride {
  readonly includes?: readonly string[];
  readonly linter?: {
    readonly rules?: {
      readonly style?: {
        readonly noRestrictedImports?: NoRestrictedImportsRule;
      };
    };
  };
}

export interface BiomeConfig {
  readonly overrides?: readonly BiomeOverride[];
}

/**
 * Parse JSONC by removing comments outside strings before passing JSON.parse.
 *
 * @example
 * ```ts
 * parseJsonc("{ // comment\n \"value\": true }");
 * // { value: true }
 * ```
 */
export function parseJsonc(text: string): unknown {
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

  return JSON.parse(output);
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
  return parseJsonc(await Bun.file(path).text()) as BiomeConfig;
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

function skipLineComment(text: string, startIndex: number): number {
  let index = startIndex;
  while (index < text.length && text[index] !== "\n") {
    index += 1;
  }
  return index;
}

function skipBlockComment(text: string, startIndex: number): number {
  let index = startIndex;
  while (index < text.length) {
    if (index + 1 < text.length && text[index] === "*" && text[index + 1] === "/") {
      return index + 1;
    }
    index += 1;
  }
  return text.length;
}
