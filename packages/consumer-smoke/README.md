# @canonical/consumer-smoke

Consumer-installability guards for the pragma monorepo (private workspace
tool — never published). Proves that the packages we publish are actually
installable and usable by an EXTERNAL npm consumer, and keeps a
release-readiness inventory of publishable packages that have never been
published (the [#599](https://github.com/canonical/pragma/issues/599)
failure class).

## CLI entrypoints (run with bun)

```bash
# Dependency-edge guard + unpublished inventory.
# Every registry lookup runs as a @canonical/task Exec effect in one
# deduplicated parallel batch (requires @canonical/task to be built).
bun packages/consumer-smoke/src/check-no-private-deps.ts [--mode=pr|publish]

# Pack every publishable package, install the tarballs in a generated
# external consumer app (npm, not bun), then tsc / vite build / SSR
# render+hydrate / publint / attw.
bun packages/consumer-smoke/src/pack-and-smoke.ts [--keep] [--skip-advisory]

# Publishable package names as an Nx --projects filter (no build needed).
bunx nx run-many -t build --projects="$(bun packages/consumer-smoke/src/list-publishable.ts)"
```

Both CI workflows (`pr.yml` advisory job, `tag.yml` pre-publish gate) call
these entrypoints directly.

## Severity model

- A PUBLISHED package depending on a private / never-published / non-registry
  (`workspace:`, `file:`, …) dependency is a hard ERROR (`--mode=publish`
  downgrades never-published deps to WARN because `lerna publish
  from-package` publishes them in the same run).
- The inventory of never-published publishable packages is a report/warning —
  an experimental package may legitimately not be published yet — with every
  package on its own line plus a count.
- Fail-closed: when the registry cannot be queried (rate limit, outage), the
  status is reported as UNDETERMINED — WARN in pr mode, hard ERROR in publish
  mode — never silently treated as published.

## Library exports

`scripts/publish-status.ts` consumes the same modules — there is exactly one
npm-registry status client in this repo:

- `registry.ts` — `registryStatusesTask` / `fetchRegistryStatuses`:
  publication status, version list, and provenance per package, as parallel,
  deterministic, mockable `@canonical/task` effects (`npm view <pkg> --json`).
- `workspace.ts` — workspace enumeration exactly as the root `workspaces`
  globs see it.
- `analysis.ts` — the pure guard/inventory logic.
- `npm-pack.ts` — stdout-only, balanced-array parsing of `npm pack --json`.
- `env.ts` — child-process environment scrubbing: spawned third-party
  processes never see token/secret-shaped variables (in particular the OIDC
  trusted-publishing credentials present in tag.yml's publish job).

## Development

```bash
cd packages/consumer-smoke
bun run check   # biome + tsc + webarchitect tool-ts
bun run test    # vitest (registry lookups tested against mocked Exec effects)
```
