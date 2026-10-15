import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["**/dist/", "shots/"] },
  js.configs.recommended,
  {
    files: ["apps/web/src/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["scripts/**/*.{js,mjs}", "**/*.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }, // check.mjs also runs code inside the page
  },
  {
    rules: {
      "no-unused-vars": ["error", { caughtErrors: "none", argsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  prettier,
];
