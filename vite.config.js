// Specify how Vite should treat and bundle GLSL files.
// The vite-plugin-glsl resolves imports within GLSL files and does inlining and minification.

import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  plugins: [glsl( {
    minify: true
  } )],
})
