/**
 * @file Stylelint configuration for authors' own CSS.
 *
 * Bans raw colours and `!important`, and requires design-token variables for
 * colour-bearing properties. Tailwind utilities and daisyUI component styles
 * are generated CSS and are excluded by the lint script's globs rather than
 * here.
 */

export default {
  plugins: ["stylelint-declaration-strict-value"],
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "scale-unlimited/declaration-strict-value": [
      [
        "/^color$/",
        "^background(-color)?$",
        "^border(-.*)?-color$",
        "^outline-color$",
        "fill",
        "stroke",
      ],
      { ignoreValues: ["transparent", "currentColor", String.raw`/^var\(--/`] },
    ],
    "declaration-no-important": true,
    "declaration-property-unit-disallowed-list": {
      "/^(margin|padding|gap|inset|top|right|bottom|left)$/": ["px"],
    },
  },
};
