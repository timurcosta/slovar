import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/", "**/dist-online/", "**/dist-killswitch/", "shots/", "**/.data/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["apps/web/src/**/*.{js,ts}", "apps/web/test/**/*.{js,ts}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["scripts/**/*.{js,mjs}", ".claude/**/*.{js,mjs}", "**/*.config.js", "apps/api/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }, // check.mjs also runs code inside the page
  },
  {
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { caughtErrors: "none", argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-unused-expressions": ["error", { allowTernary: true, allowShortCircuit: true }],
    },
  },
  prettier,
);
