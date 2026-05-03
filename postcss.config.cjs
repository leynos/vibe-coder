const removeDaisyRadialProgressProperty = () => ({
  postcssPlugin: "remove-daisy-radial-progress-property",
  AtRule(atRule) {
    if (atRule.name === "property" && atRule.params.trim() === "--radialprogress") {
      atRule.remove();
    }
  },
});

removeDaisyRadialProgressProperty.postcss = true;

module.exports = {
  plugins: [
    require("@tailwindcss/postcss"),
    require("autoprefixer"),
    // Drop DaisyUI's radial progress @property to avoid Lightning CSS warnings in Vite builds.
    removeDaisyRadialProgressProperty(),
  ],
};
