# Package manifest contracts

This document is the intentionality artifact for `package.json` manifests in
this monorepo. Every published package belongs to exactly one package type, and
each type has a field-by-field manifest contract. The contracts are
machine-enforced by [`@canonical/webarchitect`](../../packages/webarchitect)
rulesets, run from every package's `check:webarchitect` script (part of
`bun run check`, and therefore of CI).

Status: **the `react-lib` and `react-components` contracts below are
implemented and enforced today.** The `styles`, `storybook-addon`, `tool`, and
`config` contracts describe the agreed target state; they are implemented in
later waves (see "Rollout" at the end). Where a section describes a future
wave, it says so explicitly.

## Decisions

These decisions apply across package types and are referenced by the
per-type contracts below:

1. **React is a peer dependency, pinned to `^19`.** Publishable React packages
   must declare `react` and `react-dom` in `peerDependencies` with a range
   inside major 19 (`^19.0.0`), never in `dependencies`. A library that ships
   its own copy of React can cause duplicate-React hook failures in consumers;
   a peer range makes the consumer the single owner of the React instance.
   Packages mirror the peers in `devDependencies` so local builds, tests, and
   storybooks still resolve React inside the workspace.
2. **`sideEffects` is mandatory and type-dependent.** Pure libraries declare
   `"sideEffects": false` so bundlers can tree-shake every unused export.
   Component packages that ship CSS declare `"sideEffects": ["**/*.css"]` so
   bundlers keep `import "./styles.css"` statements while still tree-shaking
   the JavaScript.
3. **Consumer CSS stays library-neutral.** Component packages copy
   per-component CSS next to the compiled JS (`copyfiles` into `dist/esm`) and
   import it with relative `import "./styles.css"` statements. We do not build
   framework-specific CSS aggregate bundles; the only aggregate stylesheet that
   exists (`@canonical/react-ds-global-form`'s `dist/esm/index.css`) predates
   this decision and remains a declared subpath for its existing consumers.
4. **`@canonical/storybook-config` is build-time only.** It configures a
   package's own storybook and must live in `devDependencies`. Shipping it as a
   production dependency drags the entire Storybook toolchain into consumers'
   dependency trees.
5. **`exports` maps are explicit and NodeNext-correct.** Every published
   package declares an `exports` map with a `types` condition first, exact
   subpath matches only, and a `"./package.json": "./package.json"` entry.
   The repo compiles with `moduleResolution: nodenext`, so anything not
   declared in `exports` is unreachable for consumers — which is the point:
   a subpath is either a deliberate, audited part of the public API or it does
   not exist. Before adding or removing a subpath, grep the repo (apps,
   stories, `.storybook` configs, summon templates, README/mdx) for consumers.
6. **`publishConfig: { "access": "public" }` on every published scoped
   package**, so publishes cannot fail or default to restricted access.

## Contract: `react-lib`

Publishable React packages with no CSS: `packages/react/{head,hooks,i18n,router}`
(and, temporarily, `packages/storybook/helpers` — see the storybook wave note).

Enforced by the [`package-react-lib`](../../packages/webarchitect/rulesets/package-react-lib.ruleset.json)
ruleset (extends `package`); bind it with
`"check:webarchitect": "webarchitect package-react-lib"`.

| Field | Contract | Enforcement |
| --- | --- | --- |
| `name` | `@canonical/`-prefixed | `package` ruleset (`prefix` variable) |
| `type` | `"module"` — ESM only | `package` ruleset |
| `module` / `types` | `dist/esm/index.js` / `dist/types/index.d.ts` | `package` ruleset |
| `exports` | Explicit map; `.` with `types` condition first, then `import`; `"./package.json"` declared | `package-react-lib` requires an `exports` object |
| `sideEffects` | Exactly `false` | `package-react-lib` |
| `files` | Contains `dist` | `package` ruleset |
| `dependencies` | Must NOT contain `react` or `react-dom` | `package-react-lib` (JSON-Schema `not`/`required` absence check) |
| `peerDependencies` | `react` and `react-dom` matching `^(\^\|~\|>=)?19\.` | `package-react-lib` |
| `devDependencies` | Mirror `react`/`react-dom` so workspace build/test/storybook resolve | convention (not machine-enforced) |
| `scripts` | `build`, `test`, `check:ts` (`tsc --noEmit`) | `package` ruleset |
| `publishConfig` | `{ "access": "public" }` | convention (not machine-enforced yet) |

## Contract: `react-components`

React component packages that ship per-component CSS:
`packages/react/{ds-global,ds-global-form,ds-app,ds-app-anbox,ds-app-landscape,ds-app-launchpad,ds-app-lxd,ds-app-portal,tokens}`.

Enforced by the [`package-react-components`](../../packages/webarchitect/rulesets/package-react-components.ruleset.json)
ruleset (extends `package-react-lib`, so everything above applies unless
overridden); bind it with
`"check:webarchitect": "webarchitect package-react-components"`.

Differences from `react-lib`:

| Field | Contract | Enforcement |
| --- | --- | --- |
| `sideEffects` | Exactly `["**/*.css"]` — CSS imports are side effects, JS is tree-shakeable | `package-react-components` overrides the `react-lib` rule |
| `dependencies` | Must NOT contain `@canonical/storybook-config` (decision 4) | `package-react-components` |
| CSS delivery | Per-component CSS copied to `dist/esm` via `copyfiles`, imported relatively from components; no new aggregate bundles (decision 3) | convention |
| Extra `exports` subpaths | Only CSS entries that already exist and are consumed may be declared. Today that is only `@canonical/react-ds-global-form`: `"./styles.css"` and the legacy literal `"./dist/esm/index.css"`, both mapping to `./dist/esm/index.css` | audited per package |

## Contract: `styles` (styles/assets wave — not yet enforced)

CSS-first packages: `packages/styles/*`, `packages/ds-assets`.

- Ship sources (`files: ["src"]`) or built assets; entry points are CSS files.
- `exports` declares each stylesheet subpath explicitly.
  `@canonical/styles` already models this (`.` and `./fonts`).
- `@canonical/ds-assets` will declare `./fonts` and `./icons` subpaths in the
  styles/assets wave, so font and icon files are importable under an audited
  contract instead of via undeclared deep paths.
- Optional integrations follow the peer + `peerDependenciesMeta.optional`
  pattern that `@canonical/styles` already uses for `@canonical/ds-assets`.
- `sideEffects`: CSS is inherently side-effectful; these packages either omit
  the field or scope it to `["**/*.css"]`. Exact rule fixed in that wave.

## Contract: `storybook-addon` (storybook wave — not yet enforced)

Storybook addons and helpers: `packages/storybook/*`.

- React 19 peers + dev mirrors, same as `react-lib`.
- Storybook packages depend on Storybook APIs; their peer/dev split for
  `storybook` itself is defined in the storybook wave.
- Until then, `@canonical/storybook-helpers` is bound to `package-react-lib`
  (it is a React library from the manifest's point of view); the storybook
  wave gives these packages their own ruleset, including a CSS-aware
  `sideEffects` value where an addon ships styles.

## Contract: `tool` (tools wave — not yet enforced)

CLI tools and generators that run from TypeScript sources
(`packages/webarchitect`, `packages/summon/*`, `packages/cli/*`).

- Run from `src/` (`module`/`types` point at `src/index.ts`, `files` includes
  `src`), `bin` entries point at `src/cli.ts`, license GPL-3.0.
- Enforced today by the `tool-ts` ruleset; the tools wave adds the
  exports-map and `sideEffects` requirements.

## Contract: `config` (tools wave — not yet enforced)

Shareable configs (`configs/*`: biome, typescript, vitest, storybook configs).

- Tiny manifests whose whole API is a handful of JSON/TS files; every consumed
  file becomes a declared `exports` subpath.
- Never depend on the tool they configure at runtime; the tool is the
  consumer's dependency.

## How enforcement works

`webarchitect <ruleset>` validates the current package against a ruleset made
of JSON-Schema rules over manifest files. Rulesets compose via `extends`;
rule blocks with the same name override parent blocks (this is how
`package-react-components` replaces `react-lib`'s `"sideEffects": false`
requirement with `["**/*.css"]`). Absence requirements ("react must NOT be in
`dependencies`") are expressed with standard JSON-Schema negation:
`{ "not": { "required": ["react"] } }`.

Ruleset bindings after the react wave:

| Packages | Ruleset |
| --- | --- |
| `react/head`, `react/hooks`, `react/i18n`, `react/router` | `package-react-lib` |
| `react/ds-global`, `react/ds-global-form`, `react/ds-app*` (6), `react/tokens` | `package-react-components` |
| `storybook/helpers` | `package-react-lib` (interim; refined in storybook wave) |
| other libraries | `library` |
| tools | `tool-ts` |

`summon package --with-react` scaffolds manifests that satisfy
`package-react-components` (peers + dev mirrors, exports map, CSS-scoped
`sideEffects`) and binds `check:webarchitect` to that ruleset.

## Rollout

Contracts land in waves; each wave fixes the manifests and the enforcement
together so the rulesets are green from the moment they exist:

1. **react wave (this document's implemented scope):** `react-lib` +
   `react-components` contracts, `package-react-lib`/`package-react-components`
   rulesets, removal of the legacy `package-react` ruleset (which required the
   `dependencies.react` anti-pattern), summon generator alignment.
2. **storybook wave:** `storybook-addon` contract and ruleset;
   `storybook/helpers` moves off its interim `package-react-lib` binding.
3. **styles/assets wave:** `styles` contract; `ds-assets` `./fonts` +
   `./icons` subpaths.
4. **tools wave:** `tool` and `config` contracts.
