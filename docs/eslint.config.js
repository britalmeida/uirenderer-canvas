import globals from "globals"
import pluginVue from "eslint-plugin-vue";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript"

import uirendererRules from "../eslint.config.js"

export default defineConfigWithVueTs(

  // Use tha same rules as defined for UI Renderer,
  // because this doc sub-package shows UI Renderer code samples.
  uirendererRules,

  // Extend with rules for Vue and pug templates,
  // because that's the framework these docs use.
  vueTsConfigs.strictTypeChecked,
  vueTsConfigs.stylisticTypeChecked,
  // Vue Parsing
  ...pluginVue.configs["vue3-recommended"],
  {
    rules: {
      'vue/no-unused-vars': 'error'
    },
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    }
  },

);
