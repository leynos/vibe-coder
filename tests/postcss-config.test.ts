/**
 * @file Behavioural tests for the PostCSS build pipeline.
 *
 * The Vite build relies on `postcss.config.js` to run Tailwind and
 * Autoprefixer and to strip daisyUI's `@property --radialprogress` rule. These
 * cases load the real configuration and run its custom plugin, so a regression
 * in the pipeline is caught without a full production build.
 */

import { describe, expect, it } from "bun:test";
import postcss, { type Plugin } from "postcss";

// @ts-expect-error: the PostCSS config is plain JavaScript without declarations.
import postcssConfig from "../postcss.config.js";

type PostcssConfig = {
  readonly plugins: readonly unknown[];
};

// SAFETY: the module exports the config object produced by the PostCSS
// loader, whose `plugins` field is an array; the cast only applies the
// structural type the assertions below rely on.
const config = postcssConfig as PostcssConfig;

const RADIAL_PROPERTY =
  "@property --radialprogress { syntax: '<number>'; inherits: false; initial-value: 0; }";
const OTHER_PROPERTY =
  "@property --other { syntax: '<color>'; inherits: false; initial-value: red; }";

/**
 * Narrow one config entry to a PostCSS plugin object.
 *
 * PostCSS accepts plugin names too, so entries are only plugins when they own
 * a `postcssPlugin` field; `Object.hasOwn` inspects any value without
 * throwing on primitives.
 */
function isPlugin(entry: unknown): entry is Plugin {
  if (entry === null || entry === undefined) {
    return false;
  }

  // SAFETY: `Object.hasOwn` accepts every value and only inspects own
  // properties, so indexing cannot observe a contract the value lacks.
  const candidate = entry as { postcssPlugin?: unknown };
  return Object.hasOwn(candidate, "postcssPlugin");
}

/** Locate the custom plugin that strips daisyUI's radial-progress property. */
function findRadialProgressPlugin(): Plugin {
  const plugin = config.plugins.find(
    (entry): entry is Plugin =>
      isPlugin(entry) && entry.postcssPlugin === "remove-daisy-radial-progress-property",
  );

  if (!plugin) {
    throw new Error("postcss config is missing the radial-progress plugin");
  }

  return plugin;
}

describe("postcss config", () => {
  it("registers Tailwind, Autoprefixer, and the radial-progress plugin", () => {
    expect(config.plugins).toHaveLength(3);
    expect(findRadialProgressPlugin().postcssPlugin).toBe("remove-daisy-radial-progress-property");
  });

  it("removes the daisyUI radial-progress property and keeps other properties", async () => {
    const result = await postcss([findRadialProgressPlugin()]).process(
      `${RADIAL_PROPERTY}\n${OTHER_PROPERTY}\n`,
      { from: undefined },
    );

    expect(result.css).not.toContain("--radialprogress");
    expect(result.css).toContain("--other");
  });
});
