import js from "@eslint/js";

// Temp FlatCompat: TS does not yet support Flatconfig.
// When it does, remove the "Temp FlatCompat" code and uncomment the rest.
import tsParser from "@typescript-eslint/parser";
//import tsPlugin from "@typescript-eslint/eslint-plugin";

// Temp FlatCompat
import { FlatCompat } from '@eslint/eslintrc';
const eslintrc = new FlatCompat({})
// ~Temp FlatCompat

export default [

  // Base configurations being extended.
  js.configs.recommended,
  
  // Temp FlatCompat
  ...eslintrc.plugins("@typescript-eslint"),
  ...eslintrc.extends(
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ),
  ...eslintrc.config({
    parserOptions: {
      project: ["./tsconfig.json"],
    },
    ignorePatterns: ["Types/*", "**/*.js", "vite.config.ts", "Docs/*",],
  }),
  // ~Temp FlatCompat
  //tsPlugin.configs.strict-type-checked,
  //tsPlugin.configs.stylistic-type-checked,

  // TypeScript linting.
  {
    files: ["src/**/*.ts", "index.ts"],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
      }
    },
    //plugins: {
    //  tsPlugin,
    //},
    rules: {
      "@typescript-eslint/non-nullable-type-assertion-style": "off", // It can be more readable to explicitely write out the expected type.
    },

    linterOptions: {
      noInlineConfig: true,
    },
  }

];
