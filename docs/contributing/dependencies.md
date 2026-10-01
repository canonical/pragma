<!-- Copied from https://github.com/canonical/pragma-core/blob/main/docs/contributing/dependencies.md; change it there first. -->
# Dependencies and the lockfile

Read this when a change adds, removes or bumps a dependency, changes a version, or touches `bun.lock`.

## Contents

- Checklist
- The pinned Bun
- Edit the manifests
- Regenerate the lockfile
- Read the lockfile diff

## Checklist

```
- [ ] 1. Use the pinned Bun for every install
- [ ] 2. Edit the manifests
- [ ] 3. Regenerate the lockfile: two installs, then a third that changes nothing
- [ ] 4. Read the lockfile diff and disclose what else moved
- [ ] 5. Apply this repository's notes in .kb/this-repository.md
```

## The pinned Bun

`bun.lock` is regenerated only with the Bun pinned in `.bun-version`. Another version writes the lockfile differently from the one CI compares against, and the difference is not visible by eye. When `bun --version` differs from the pin, run `bunx bun@$(cat .bun-version) install`.

## Edit the manifests

- **Sibling ranges stay explicit.** Never use the `workspace:` protocol: every package must stay installable on its own. The root `check:ranges` script checks the ranges between siblings.
- **Remove an unused peer dependency.** Do not mark it optional instead: `optionalDependencies` would install the package into every consumer.
- **Shared TypeScript configurations keep old majors in their peer range**, for example `^5.9.3 || ^6.0.0 || ^7.0.0`. Drop a major only when a change requires it.
- **TypeScript 7 no longer loads every installed `@types/*` package** (`types` defaults to `[]`). A package names the ones it needs, for example `"types": ["bun"]`.
- **When `@biomejs/biome` is bumped, update every `biome.json` whose `$schema` names a Biome version.** A schema left behind makes `biome check` fail to read its configuration.
- **In pragma-core, every package manifest keeps its `repository` field.** npm's provenance check requires it to name the repository that runs the release, and Renovate groups a pragma-core release into one pull request by it.

## Regenerate the lockfile

- **Run `bun install` twice.** When a change edits workspace versions and sibling ranges together, Bun records the new versions on the first install and the new ranges only on the second. The second install works around a Bun bug; drop it once the pinned Bun includes the upstream fix ([oven-sh/bun#41931](https://github.com/oven-sh/bun/pull/41931)). The release's version bump installs twice for the same reason ([releases.md](releases.md)).
- **A third `bun install` must leave `bun.lock` unchanged.** Commit the result.
- **Never hand-merge `bun.lock`.** Resolve a conflict by regenerating it with the pinned Bun and committing the regenerated file.

## Read the lockfile diff

- **Regenerating the lockfile can dedupe other packages within their declared ranges.** Say so in the pull request body.
- **Keep `sigstore` at the exact version the root `patchedDependencies` patch names.** The patch prevents half-published releases and applies only to that version, and Bun installs an unpatched version without any warning. A step in `pr.yml` fails when the lockfile no longer carries the patch.

`.kb/this-repository.md` names any topic that applies to dependencies here. Then commit and push ([commits.md](commits.md)).
