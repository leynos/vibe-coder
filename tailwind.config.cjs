function loadGeneratedTokens() {
  try {
    return require("./tokens/dist/tailwind.theme.cjs");
  } catch (_error) {
    console.warn(
      "Missing design token build output. Run `pnpm run tokens:build` before compiling Tailwind.",
    );
    return { tailwind: { extend: {} }, daisyThemes: [], themeNames: [] };
  }
}

const generated = loadGeneratedTokens();
const themeExtend = generated.tailwind?.extend ?? {};
/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}", "./tokens/dist/tokens.css"],
  theme: {
    extend: themeExtend,
  },
  plugins: [require("daisyui")],
};
