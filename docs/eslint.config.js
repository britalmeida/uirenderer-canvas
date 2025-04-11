import uirendererRules from "../eslint.config.js"

// Temp FlatCompat
import { FlatCompat } from '@eslint/eslintrc';
const eslintrc = new FlatCompat({})
// ~Temp FlatCompat

export default [

  // Base configurations being extended.
  // Temp
  ...eslintrc.extends(
    'plugin:vue/vue3-recommended',
    "@vue/eslint-config-typescript/recommended",
  ),

  uirendererRules,
];
