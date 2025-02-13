# @canonical/biome-config

This is a [Biome](https://biomejs.dev/) configuration that provides 
a set of default configurations for Biome projects.

## Install

1. Install [Biome](https://biomejs.dev/): `bun add -d @biomejs/biome`
2. Install configuration: `bun add -d @canonical/biome-config`

## Consume

Create `biome.json` in the root of your project and extend this configuration.

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": [
    "@canonical/biome-config"
  ],
  "files": {
    "include": [
      "src",
      "*.json"
    ]
  }
}
```
Run `biome` commands as usual. The base configuration will be applied.

Example `package.json` scripts are provided below.

```jsonc
{
  "scripts": {
    "check": "biome check",
    "format": "biome format",
    "lint": "biome lint"
  }
}
```

## Configuration

This configuration enables the following behavior:

1. Formatting Rules
   1. Two-space indentation
   2. Double-quote strings
2. Organized imports
3. Apply Biome's recommended linting rules by default
4. Disable version control integration: no interaction with Git
   1. Ignores `.gitignore`: Explicitly includes all files unless they are ignored manually or other files are included explicitly.
   2. Ignores Git add status: No need to stage files before running `biome check` or `biome format`.
5. Ignores checking all files in `node_modules` and `dist` directories. Please note that if you specify your own ignored files using `files.ignore` in `biome.json`, you will override this behavior.
   
### Caveats
#### Monorepos
Biome does not yet fully support monorepos. 
Biome and IDE plugins that use it may not work as expected if you are working in a monorepo.
As a work-around, [Biome suggests](https://biomejs.dev/guides/big-projects/#monorepos) including a `biome.json` at the 
root of a monorepository, and using `overrides` to specify any exceptions for sub-packages.

#### Language support
Biome is still in development and may not support all languages or features.
We recommend checking the [Biome supported languages list](https://biomejs.dev/internals/language-support/) 
to ensure that your project is supported.
