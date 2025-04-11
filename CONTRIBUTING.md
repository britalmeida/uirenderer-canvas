# Developing UI Renderer - Canvas

## IDE Configuration

`eslint.experimental.useFlatConfig`
get stuff from watchtower + glsl plugins

## Update and Run
1. Get the latest changes and update the development environment:
   ```
   git pull
   yarn install
   ```

2. The codebase should always be verified to have no errors or warnings in every commit. The IDE should help.
   ```
   yarn run lint  
   yarn run build
   ```

3. ```
   yarn run dev
   ```

### Checking for dependency updates:
   ```
   yarn upgrade-interactive
   yarn install
   ```

   UI Renderer only has dependencies for the development environment like TS, linting. When updating, also:
   - read what is new. Are there are new checks that should be enabled in `tsconfig.json` or `eslintConfig`?
   - verify that the codebase is happy
      ```
      yarn lint  
      yarn run build:types
      ```
   Commit!


## Releasing a new version

1. Verify that everything is good to go and generate the package types:  
   ```
   yarn run lint  
   yarn run build
   ```
2. Update changelog.
3. Bump the version in `package.json`, create a git commit and a tag. Can be done in one with: `npm version major|minor|patch`
4. ```
   git push --tags
   ```
5. ```
   npm publish [--tag beta] [--dry-run]
   ```

## Committing & Pull requests

Support & Maintenance
example link to another md [the introduction to working in the docs repository](/contributing/working-in-docs-repository.md) :confetti_ball:
