# Canonical Svelte Typescript Configuration

This package provides a central configuration for Canonical's Svelte projects.

This configuration extends a [base configuration](https://www.npmjs.com/package/@canonical/typescript-config),
which provides more general TypeScript settings and is suitable for non-Svelte projects.

## Getting Started
1. Install Typescript: `bun add -d typescript`
2. Install this configuration: `bun add -d @canonical/typescript-config-svelte`
3. Create a `tsconfig.json` file in the root of your project and extend this configuration.

```json
{
  "extends": "@canonical/typescript-config-svelte"
}
```

## Configuration

This configuration enables the following behavior:
1. `svelte` types
2. `vite/client` types
3. [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax): enforces explicit `import type` / `export type` syntax for type-only imports and exports. This is required for Svelte component imports to work correctly with TypeScript 5 — see the [Svelte TypeScript docs](https://svelte.dev/docs/svelte/typescript#tsconfig.json-settings).

### Caveats

#### `moduleResolution` may still need to be set explicitly per-package

This configuration inherits [`"module": "NodeNext"`](https://www.npmjs.com/package/@canonical/typescript-config) from the base configuration, which normally implies `"moduleResolution": "nodenext"` as well. However, `svelte-check` (used by the `check:ts` script in Svelte packages) does not always apply this inference correctly, and can fail to resolve packages that rely on Node's `exports` field (e.g. `vite`, `@storybook/addon-svelte-csf`) unless `"moduleResolution": "nodenext"` is also declared explicitly in the consuming package's own `tsconfig.json`. `tsc` itself does not have this issue. If you see module resolution errors from `svelte-check` that don't reproduce with `tsc --noEmit`, try adding the explicit override to your package's `tsconfig.json`.
