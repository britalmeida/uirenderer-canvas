# UI Renderer Canvas - Getting Started

Demo code making use of UI Renderer - Canvas.  
Examples are provided using Vue.js, but can be adapted to other web frameworks or static websites.

## No Framework

## Vue.js

### Recommended IDE Setup

VSCode: enable following extensions:
- slevesque.shader
- Vue.volar
- johnsoncodehk.vscode-typescript-vue-plugin (takeover mode)
- dbaeumer.vscode-eslint

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).



## Project Setup

```sh
yarn install
```

### Compile and Hot-Reload for Development

```sh
yarn run dev
```

### Type-Check, Compile and Minify for Production

```sh
yarn run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
yarn run lint
```

## Contributing to UI Renderer - Canvas

### Recommended IDE Setup

### Building and Packaging
VSCode: enable following extensions:
- slevesque.shader
- Vue.volar
- johnsoncodehk.vscode-typescript-vue-plugin (takeover mode)
- dbaeumer.vscode-eslint

Currently, we configured `.tscofing.json` with the only purpose of building type declaration (`.d.ts`).
This means that all the compiler flags are specified in `tsconfig.json` and the `build:types` command in `package.json` simply calls `tsc`.

This command is also called everything we do publish with `npm publish`.


### Publishing
* Bump the version in `package.json`
* Run `npm publish`
* For beta: `npm publish --tag beta`
