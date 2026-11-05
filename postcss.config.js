/**
 * @file PostCSS pipeline for the Vite build.
 *
 * Runs Tailwind CSS v4 followed by Autoprefixer, then drops daisyUI's
 * `@property --radialprogress` declaration so Lightning CSS does not warn
 * about it during production builds.
 */

import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

/**
 * Build the PostCSS plugin that strips daisyUI's `--radialprogress` property.
 *
 * Lightning CSS warns about the declaration on every production build, and
 * the property is not needed once Tailwind has inlined the utilities that use
 * it, so removing it keeps builds quiet without changing rendered output.
 *
 * @returns A PostCSS plugin object registered as
 * `remove-daisy-radial-progress-property`.
 *
 * @example
 * ```js
 * export default { plugins: [removeDaisyRadialProgressProperty()] };
 * ```
 */
const removeDaisyRadialProgressProperty = () => ({
  postcssPlugin: "remove-daisy-radial-progress-property",
  AtRule(atRule) {
    if (atRule.name === "property" && atRule.params.trim() === "--radialprogress") {
      atRule.remove();
    }
  },
});

removeDaisyRadialProgressProperty.postcss = true;

export default {
  plugins: [
    tailwindcss,
    autoprefixer,
    // Drop DaisyUI's radial progress @property to avoid Lightning CSS warnings in Vite builds.
    removeDaisyRadialProgressProperty(),
  ],
};
