/**
 * @file PostCSS pipeline for the Vite build.
 *
 * Runs Tailwind CSS v4 followed by Autoprefixer, then drops daisyUI's
 * `@property --radialprogress` declaration so Lightning CSS does not warn
 * about it during production builds.
 */

import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

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
