# @canonical/biome-config-svelte

This package extends [@canonical/biome-config](../biome/README.md) with Svelte-specific overrides for [Biome](https://biomejs.dev/).

Use this in Svelte projects so that `.svelte` files get appropriate lint/format settings (e.g. relaxed rules until Biome’s Svelte support improves).

## Important note

> **Watch for future Biome releases** with improved Svelte support and reconsider these rules when appropriate. See [Biome issue #7928](https://github.com/biomejs/biome/issues/7928) (almost fixed 14/15 tasks).


## Install

1. Install [Biome](https://biomejs.dev/): `bun add -d @biomejs/biome`
2. Install this config: `bun add -d @canonical/biome-config-svelte`

## Consume

Create or update `biome.json` in the root of your project and extend this configuration (you do **not** need to extend `@canonical/biome-config` separately).

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.11/schema.json",
  "extends": ["@canonical/biome-config-svelte"],
  "files": {
    "includes": ["src", "*.config.ts", "*.config.js"]
  }
}
```

Run `biome` commands as usual. You get the base Canonical Biome config plus Svelte overrides.

## Svelte overrides

This config adds an override for `**/*.svelte` that:

- Turns off certain style/correctness rules that are not yet reliable for Svelte (see [Biome issue #7928](https://github.com/biomejs/biome/issues/7928)).
- Enables `html.formatter.indentScriptAndStyle` for `.svelte` files.

When Biome’s Svelte support improves, these relaxations may be reduced or removed.

