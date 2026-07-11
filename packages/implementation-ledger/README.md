# @canonical/implementation-ledger

Append-only implementation-version ledger for Canonical's design system.

Where `bun run collect` (scripts/collect-implementations.ts) rewrites a
snapshot of the *current* annotations, this tool maintains a second, separate
artifact — `data/implementation-versions.ttl` — that grows like a changelog:
one immutable entry per published (npm package, version) pair, recording which
design system blocks that version makes available, at which block version, and
the import statement a consumer would use.

## Usage

```bash
# From anywhere inside the monorepo:
implementation-ledger collect                # all annotated packages
implementation-ledger collect --package .    # only the current package
implementation-ledger collect --dry-run      # report without writing
```

Packages are discovered exactly like the existing collector: workspace
packages carrying a `design-system.json`, scanned with the pattern for their
platform from the root `ds.config.json`.

## Annotation grammar

The ledger understands the same `@implements` grammar as the existing collect
tooling, including its optional per-block version override:

```ts
/** @implements ds:global.component.button */          // version = package version
/** @implements ds:global.component.button@4.2.0 */    // explicit block version
/** @implements ds:global.component.button [draft] */  // draft marker
```

When no `@<semver>` suffix is present, the block version defaults to the
containing package's `package.json` version.

## Invariants

- **Append-only**: existing ledger bytes are never modified or reordered;
  new stanzas are only appended.
- **Idempotent**: re-collecting a recorded (package, version) pair with
  identical content is a silent no-op.
- **Integrity**: if a recorded pair is re-collected with *different* content,
  the tool fails loudly and writes nothing — a republished version with
  different implementations is an integrity violation. Bump the version
  instead; never rewrite ledger history.

Entry headers derive their provenance from git (`git <shortsha> (<date>)`),
not wall-clock time, so output is reproducible per commit.

## Wiring

- Every component package with storybook stories runs
  `implementation-ledger collect --package .` at the end of its `build`.
- The release flow (`.github/actions/lerna-version`) runs the full collect
  right after `lerna version` bumps versions, so each release commit appends
  the ledger entries for the versions it publishes.
