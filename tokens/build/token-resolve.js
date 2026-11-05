/** @file Pure helpers that unwrap, index, and resolve design tokens. */

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Return true when the value is a non-array object (the shape used by tokens).
 *
 * @param {unknown} value - Candidate token node.
 * @returns {boolean} `true` for plain objects and `false` otherwise.
 */
export const isPlainObject = (value) => value instanceof Object && !Array.isArray(value);

/**
 * Return true for string primitives, without narrowing on `typeof`.
 *
 * @param {unknown} value - Candidate token value.
 * @returns {boolean} `true` for string primitives.
 */
const isString = (value) => Object.prototype.toString.call(value) === "[object String]";

/**
 * Recursively unwrap Style Dictionary token nodes to their `value` payload.
 *
 * Object keys are sorted with a numeric-aware collator so generated artefacts
 * are byte-for-byte stable across machines.
 *
 * @param {unknown} input - Raw token tree.
 * @returns {unknown} The unwrapped value with keys in collated order.
 */
export function unwrap(input) {
  if (Array.isArray(input)) {
    return input.map((entry) => unwrap(entry));
  }
  if (!isPlainObject(input)) {
    return input;
  }
  if (Object.hasOwn(input, "value")) {
    return input.value;
  }
  return Object.fromEntries(
    Object.entries(input)
      .toSorted(([a], [b]) => collator.compare(a, b))
      .map(([key, value]) => [key, unwrap(value)]),
  );
}

/**
 * Index every leaf of a token tree by its dotted path.
 *
 * @param {unknown} node - Token node to walk.
 * @param {string[]} pathParts - Path segments accumulated so far.
 * @param {Map<string, unknown>} target - Lookup to populate.
 */
export function flattenLookup(node, pathParts, target) {
  if (!isPlainObject(node)) {
    if (pathParts.length > 0) {
      target.set(pathParts.join("."), node);
    }
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    flattenLookup(value, [...pathParts, key], target);
  }
}

/**
 * Resolve `{path.to.token}` references against the flattened lookup.
 *
 * @param {unknown} input - Token value that may contain references.
 * @param {Map<string, unknown>} lookup - Flattened token index.
 * @param {Set<string>} [stack] - References currently being resolved.
 * @returns {unknown} The value with every reference replaced.
 * @throws {Error} When a reference is circular or names an unknown token.
 */
export function resolveReferences(input, lookup, stack = new Set()) {
  if (Array.isArray(input)) {
    return input.map((value) => resolveReferences(value, lookup, new Set(stack)));
  }
  if (isPlainObject(input)) {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        resolveReferences(value, lookup, new Set(stack)),
      ]),
    );
  }
  if (!isString(input)) {
    return input;
  }
  const match = input.match(/^\{([^}]+)\}$/);
  if (!match) {
    return input;
  }
  const pathKey = match[1];
  if (stack.has(pathKey)) {
    throw new Error(`Circular token reference detected: ${[...stack, pathKey].join(" -> ")}`);
  }
  if (!lookup.has(pathKey)) {
    throw new Error(`Unknown token reference "${pathKey}"`);
  }
  return resolveReferences(lookup.get(pathKey), lookup, new Set([...stack, pathKey]));
}

/**
 * Split a CSS font-family list into individual family names.
 *
 * @param {string | undefined} fontList - Comma-separated family list.
 * @returns {string[]} Trimmed family names without surrounding quotes.
 */
export function toFontArray(fontList) {
  if (!fontList) return [];
  return fontList
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^"(.*)"$/, "$1"));
}

/**
 * Convert a kebab- or snake-case token name to title case.
 *
 * @param {string} name - Token or file name.
 * @returns {string} Title-cased words joined by single spaces.
 */
export function toTitleCase(name) {
  return name
    .replaceAll(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * Render CSS declarations in a stable, collated order.
 *
 * @param {string} selector - CSS selector for the block.
 * @param {Record<string, string>} declarations - Custom properties to emit.
 * @returns {string} A CSS block ending with a newline.
 */
export function formatCssBlock(selector, declarations) {
  const lines = Object.entries(declarations)
    .toSorted(([a], [b]) => collator.compare(a, b))
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `${selector} {\n${lines}\n}\n`;
}

/**
 * Derive the core and alias custom properties for one theme.
 *
 * @param {Record<string, unknown>} meta - Theme metadata from its JSON file.
 * @param {Record<string, any>} semantic - Resolved semantic colour tokens.
 * @param {Record<string, any>} resolvedTokens - Fully resolved token catalogue.
 * @returns {Record<string, unknown>} Theme metadata and CSS variables.
 */
export function deriveThemeArtefacts(meta, semantic, resolvedTokens) {
  const neutral = resolvedTokens.color?.neutral ?? {};
  const radius = resolvedTokens.radius ?? {};

  const base100 = semantic.bg?.default ?? neutral["50"] ?? "#ffffff";
  const base200 = semantic.bg?.subtle ?? neutral["0"] ?? base100;
  const base300 = semantic.bg?.muted ?? neutral["100"] ?? base200;
  const baseOverlay = semantic.bg?.overlay ?? neutral["200"] ?? base300;
  const baseContent = semantic.fg?.default ?? neutral["900"] ?? "#111111";
  const baseContentMuted = semantic.fg?.muted ?? neutral["600"] ?? baseContent;

  const brandDefault =
    semantic.brand?.default ?? resolvedTokens.color?.primary?.["500"] ?? "#3b82f6";
  const brandHover =
    semantic.brand?.hover ?? resolvedTokens.color?.primary?.["600"] ?? brandDefault;
  const brandContrast = semantic.brand?.contrast ?? neutral["0"] ?? "#ffffff";

  const accentDefault =
    semantic.accent?.default ?? resolvedTokens.color?.secondary?.["500"] ?? brandDefault;
  const accentHover =
    semantic.accent?.hover ?? resolvedTokens.color?.secondary?.["600"] ?? accentDefault;
  const accentContrast = semantic.accent?.contrast ?? baseContent;

  const status = semantic.status ?? {};
  const infoDefault = status.info?.default ?? resolvedTokens.color?.info?.["500"] ?? accentDefault;
  const infoContrast = status.info?.contrast ?? baseContent;
  const successDefault =
    status.success?.default ?? resolvedTokens.color?.success?.["500"] ?? "#22c55e";
  const successContrast = status.success?.contrast ?? baseContent;
  const warningDefault =
    status.warning?.default ?? resolvedTokens.color?.warning?.["500"] ?? "#eab308";
  const warningContrast = status.warning?.contrast ?? baseContent;
  const errorDefault = status.error?.default ?? resolvedTokens.color?.error?.["500"] ?? "#ef4444";
  const errorContrast = status.error?.contrast ?? baseContent;

  const coreVariables = {
    "--border": "1px",
    "--depth": "0",
    "--noise": "0",
    "--radius-badge": radius.full ?? "9999px",
    "--radius-box": radius.lg ?? "1rem",
    "--radius-btn": radius.md ?? "0.5rem",
    "--color-base-100": base100,
    "--color-base-200": base200,
    "--color-base-300": base300,
    "--color-base-overlay": baseOverlay,
    "--color-base-content": baseContent,
    "--color-base-content-muted": baseContentMuted,
    "--color-primary": brandDefault,
    "--color-primary-content": brandContrast,
    "--color-primary-hover": brandHover,
    "--color-secondary": accentDefault,
    "--color-secondary-content": accentContrast,
    "--color-accent": accentHover,
    "--color-accent-content": accentContrast,
    "--color-neutral": baseOverlay,
    "--color-neutral-content": baseContent,
    "--color-info": infoDefault,
    "--color-info-content": infoContrast,
    "--color-success": successDefault,
    "--color-success-content": successContrast,
    "--color-warning": warningDefault,
    "--color-warning-content": warningContrast,
    "--color-error": errorDefault,
    "--color-error-content": errorContrast,
  };

  const aliasVariables = {
    "--a": "var(--color-accent)",
    "--ac": "var(--color-accent-content)",
    "--b1": "var(--color-base-100)",
    "--b2": "var(--color-base-200)",
    "--b3": "var(--color-base-300)",
    "--bc": "var(--color-base-content)",
    "--bcm": "var(--color-base-content-muted)",
    "--in": "var(--color-info)",
    "--inc": "var(--color-info-content)",
    "--n": "var(--color-neutral)",
    "--nc": "var(--color-neutral-content)",
    "--p": "var(--color-primary)",
    "--pc": "var(--color-primary-content)",
    "--pf": "var(--color-primary-hover)",
    "--s": "var(--color-secondary)",
    "--sc": "var(--color-secondary-content)",
    "--su": "var(--color-success)",
    "--suc": "var(--color-success-content)",
    "--wa": "var(--color-warning)",
    "--wac": "var(--color-warning-content)",
    "--er": "var(--color-error)",
    "--erc": "var(--color-error-content)",
  };

  const cssVariables = { ...coreVariables, ...aliasVariables };

  return {
    meta,
    semantic,
    coreVariables,
    aliasVariables,
    cssVariables,
    daisyTheme: {
      name: meta.name,
      displayName: meta.displayName,
      default: Boolean(meta.default),
      prefersDark: Boolean(meta.prefersDark),
      prefersLight: Boolean(meta.prefersLight),
      colorScheme: meta.colorScheme ?? null,
      variables: coreVariables,
    },
  };
}