import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/", "shots/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["apps/web/src/**/*.{js,ts}", "apps/web/test/**/*.{js,ts}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["scripts/**/*.{js,mjs}", "**/*.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }, // check.mjs also runs code inside the page
  },
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { caughtErrors: "none", argsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-unused-expressions": ["error", { allowTernary: true, allowShortCircuit: true }],
    },
  },
  prettier,
);
