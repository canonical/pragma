# @canonical/renovate-config

Shared Renovate configuration for Canonical monorepos.

## Usage

In your repository's `renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>canonical/pragma//configs/renovate"]
}
```

Or if published to npm:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["@canonical"]
}
```

## What's included

- **Weekly schedule** — runs before 9am on Mondays
- **Batching families** — groups related dependencies into single PRs:
  - `biome` — `@biomejs/biome`, `@canonical/biome-config`
  - `typescript` — `typescript`, `@canonical/typescript-config-*`
  - `vitest` — `vitest`, `@vitest/*`
  - `lerna-nx` — `lerna`, `nx`, `@nx/*`
  - `canonical` — `@canonical/*` (catch-all for internal packages)
- **DevDep automerge** — patch and minor updates for devDependencies
- **Labels** — `Maintenance 🔨` on all Renovate PRs
- **Semantic commits** — `chore(deps): ...` format

## Adding domain-specific groups

Repos with domain-specific deps can add local `packageRules`:

```json
{
  "extends": ["@canonical"],
  "packageRules": [
    {
      "description": "Group Lit ecosystem",
      "matchPackageNames": ["lit"],
      "matchPackagePrefixes": ["@lit/", "@lit-labs/"],
      "groupName": "lit"
    }
  ]
}
```
