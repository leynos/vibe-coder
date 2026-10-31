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
