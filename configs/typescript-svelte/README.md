# Canonical Svelte Typescript Configuration

This package provides a central configuration for Canonical's Svelte projects.

This configuration extends a [base configuration](https://www.npmjs.com/package/@canonical/typescript-config-base),
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
