import eslint_js from "@eslint/js";
import eslint_ts from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default eslint_ts.config(

    // Global ignores. These files will not be linted at all.
    {
      name: "uirenderer-canvas/global-ignores",
      ignores: ["types/", "dist/", "docs/", ".idea/"],
    },

    // Base configurations which will match .js and .ts files.
    // Subsequent configurations can affect the same files and will effectively extend these.
    {
      name: "uirenderer-canvas/js_fallback",
      files: ["**/*.js", "**/*.mjs"],
      plugins: { eslint_js },
      extends: [
        eslint_js.configs.recommended
      ]
    },

    // TypeScript linting for the project's source.
    {
      name: "uirenderer-canvas/ts-linting",
      files: ["**/*.ts"],

      extends: [
        eslint_ts.configs.strictTypeChecked,
        eslint_ts.configs.stylisticTypeChecked,
      ],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          projectService: true, // Use the tsconfig.json file nearest to the file being parsed.
        }
      },
      plugins: {
        tsPlugin,
      },
      rules: {
        "@typescript-eslint/non-nullable-type-assertion-style": "off", // It can be more readable to explicitly write out the expected type.
      },

      linterOptions: {
        noInlineConfig: true,
      },
    },

);
