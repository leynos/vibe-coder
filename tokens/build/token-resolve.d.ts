/**
 * @file Type declarations for the pure token-resolution helpers.
 *
 * The implementation is plain ESM JavaScript because the token build runs
 * under Bun without a compilation step. These declarations give the unit
 * tests a checked contract without adding a build step to the script.
 */

/**
 * A JSON-like value accepted by the token helpers.
 *
 * Token sources are plain JSON, so the helpers can receive strings, numbers,
 * booleans, `null`, arrays, or nested token objects.
 */
export type TokenValue = string | number | boolean | null | readonly TokenValue[] | TokenObject;

/** A token object keyed by token name. */
export interface TokenObject {
  readonly [key: string]: TokenValue;
}

/** Metadata read from one theme definition file. */
export interface ThemeMeta {
  readonly name: string;
  readonly displayName: string;
  readonly default: boolean;
  readonly prefersDark: boolean;
  readonly prefersLight: boolean;
  readonly colorScheme?: string;
}

/** Resolved artefacts derived from one theme. */
export interface ThemeArtefacts {
  readonly meta: ThemeMeta;
  readonly semantic: TokenObject;
  readonly coreVariables: Record<string, string>;
  readonly aliasVariables: Record<string, string>;
  readonly cssVariables: Record<string, string>;
  readonly daisyTheme: {
    readonly name: string;
    readonly displayName: string;
    readonly default: boolean;
    readonly prefersDark: boolean;
    readonly prefersLight: boolean;
    readonly colorScheme: string | null;
    readonly variables: Record<string, string>;
  };
}

/** Recursively unwrap Style Dictionary token nodes to their `value` payload. */
export function unwrap(input: TokenValue): TokenValue;

/** Index every leaf of a token tree by its dotted path. */
export function flattenLookup(
  node: TokenValue,
  pathParts: readonly string[],
  target: Map<string, TokenValue>,
): void;

/** Resolve `{path.to.token}` references against the flattened lookup. */
export function resolveReferences(
  input: TokenValue,
  lookup: ReadonlyMap<string, TokenValue>,
  stack?: ReadonlySet<string>,
): TokenValue;

/** Split a CSS font-family list into individual family names. */
export function toFontArray(fontList?: string): string[];

/** Convert a kebab- or snake-case token name to title case. */
export function toTitleCase(name: string): string;

/** Render CSS declarations in a stable, collated order. */
export function formatCssBlock(
  selector: string,
  declarations: Readonly<Record<string, string>>,
): string;

/** Derive the core and alias custom properties for one theme. */
export function deriveThemeArtefacts(
  meta: ThemeMeta,
  semantic: TokenObject,
  resolvedTokens: TokenObject,
): ThemeArtefacts;