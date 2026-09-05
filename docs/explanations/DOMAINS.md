# Domains

Almost every package in this repository lives under a directory that names a **concern**: `packages/styles/` holds the stylesheets, `packages/runtime/` holds the framework-agnostic engines, `packages/contracts/` holds the type contracts the rest of the repository agrees on. That directory is the package's **domain**. Two packages sit outside every domain, and `configs/` and `apps/` sit outside `packages/` altogether; each has a section of its own below.

This is [principle II](../../CONSTITUTION.md#ii-domain-driven-design) applied to the filesystem: the system is organised around domains, not around technical layers. The practical payoff is that a question about the repository can be answered by opening a folder. Someone looking for the icons does not need to know that they are published as `@canonical/ds-assets`; they need to know that assets are a concern, and that concerns are folders. A domain with a single package in it is fine — `packages/contracts/` has one — because the folder is a statement about what the concern is, not a bin that has to be filled.

Two things a domain is deliberately **not**:

- **Not a layer.** `packages/react/` is not "the presentation layer". It is the React binding of the design system, and it contains everything React-shaped, from primitives to product-specific application components.
- **Not a product.** There is no `packages/launchpad/`. Launchpad's components sit in `packages/react/ds-app-launchpad` and `packages/svelte/ds-app-launchpad`, under the technology that makes them what they are. A product that consumes half the repository would otherwise have to own half the repository.

## The Folder and the npm Name Are Two Different Names

A package's npm name is its own. It is the name consumers type, the name that appears in a lockfile, and the name that carries whatever history the package already has on the registry. Moving a package into a domain folder does not change it, and this document does not propose changing it.

So the two names agree in some places and disagree in others, and that is expected. `packages/react/ds-global` publishes as `@canonical/react-ds-global`: folder and name say the same thing. `packages/runtime/router` publishes as `@canonical/router-core`, where the folder says *what concern it serves* (a framework-agnostic engine) and the name says *what product it is* (the core half of the router, paired with `@canonical/router-react`). Neither is wrong; they are answering different questions.

The domain tables below record both, so the disagreements are visible rather than surprising. The **Folder-derived** column shows what the name would be if it were mechanically derived from the folder as `<domain>-<name>`. Where it differs from the published name, the published name wins: the column documents the gap, it is not a plan to close it. For a plain inventory of every package with its purpose, read the [package reference](../../README.md#package-reference); the tables here exist to show where folder and name diverge.

Two naming habits are worth stating, because both follow from principle II's rule that redundancy in a name signals structure not carrying its weight:

- A domain's own principal package drops the redundant half. `packages/styles/main` publishes as `@canonical/styles`, not `@canonical/styles-main`.
- The `ds-` prefixed packages keep their full leaf name: `assets/ds-assets`, not `assets/main`. The `ds-` prefix already does the disambiguating work, and a folder that carries it is far easier to find than one more directory called `main`.

## `packages/styles`: The Stylesheets

Plain CSS, layered. This domain holds every stylesheet that ships independently of a component: the reset, the typography engine, the token surface, and the development aids.

Component styles are not here. They live beside their component, in the component's own package, so that they are tree-shaken with it.

| Folder | npm name | Folder-derived |
|---|---|---|
| `styles/main` | `@canonical/styles` | `styles-main` |
| `styles/typography` | `@canonical/styles-typography` | same |
| `styles/debug` | `@canonical/styles-debug` | same |

## `packages/react`: The React Implementation

React components and React-only libraries: the tiered component packages (`ds-global`, `ds-global-form`, `ds-app` and the product-specific `ds-app-*`), the hooks, the head manager, the token-explorer components, and server-side rendering with its deployment adapters. The React bindings of a framework-agnostic engine also live here, beside their siblings rather than beside their core (`router`, `i18n`).

What does not belong: logic no React consumer needs. If more than one framework would want it, it belongs in `packages/runtime/`.

| Folder | npm name | Folder-derived |
|---|---|---|
| `react/ds-global` | `@canonical/react-ds-global` | same |
| `react/ds-global-form` | `@canonical/react-ds-global-form` | same |
| `react/ds-app` | `@canonical/react-ds-app` | same |
| `react/ds-app-anbox` | `@canonical/react-ds-app-anbox` | same |
| `react/ds-app-landscape` | `@canonical/react-ds-app-landscape` | same |
| `react/ds-app-launchpad` | `@canonical/react-ds-app-launchpad` | same |
| `react/ds-app-lxd` | `@canonical/react-ds-app-lxd` | same |
| `react/ds-app-portal` | `@canonical/react-ds-app-portal` | same |
| `react/hooks` | `@canonical/react-hooks` | same |
| `react/head` | `@canonical/react-head` | same |
| `react/tokens` | `@canonical/react-tokens` | same |
| `react/ssr` | `@canonical/react-ssr` | same |
| `react/ssr-adapter-cloudflare` (internal) | `@canonical/ssr-adapter-cloudflare` | `react-ssr-adapter-cloudflare` |
| `react/ssr-adapter-deno` (internal) | `@canonical/ssr-adapter-deno` | `react-ssr-adapter-deno` |
| `react/ssr-adapter-vercel` (internal) | `@canonical/ssr-adapter-vercel` | `react-ssr-adapter-vercel` |
| `react/router` | `@canonical/router-react` | `react-router` |
| `react/i18n` | `@canonical/i18n-react` | `react-i18n` |

`router-react` and `i18n-react` keep product-first names because each is one half of a pair, and the pair reads better than the folder does: `router-core` and `router-react` sort together, `runtime-router` and `react-router` do not. `react-router` would also be read as [React Router](https://reactrouter.com) by everyone who saw it, scope or no scope.

## `packages/svelte`: The Svelte Implementation

The same concern as `packages/react`, for Svelte: global and application components, the product-specific packages, and the SSR test harness.

What does not belong: anything a React consumer would also want. Shared logic goes to `packages/runtime/`, shared types to `packages/contracts/`.

| Folder | npm name | Folder-derived |
|---|---|---|
| `svelte/ds-global` | `@canonical/svelte-ds-global` | same |
| `svelte/ds-app` | `@canonical/svelte-ds-app` | same |
| `svelte/ds-app-launchpad` | `@canonical/svelte-ds-app-launchpad` | same |
| `svelte/ds-app-wpe` | `@canonical/svelte-ds-app-wpe` | same |
| `svelte/ssr-test` | `@canonical/svelte-ssr-test` | same |

## `packages/lit`: The Web Components Implementation

Lit-based custom elements, and anything that has to import Lit to do its job. Currently one prototype package; see [web components architecture](WEB_COMPONENTS_ARCHITECTURE.md) for the decisions behind it.

What does not belong: a helper that never touches Lit. If it holds logic and imports nothing framework-shaped, it is a runtime.

| Folder | npm name | Folder-derived |
|---|---|---|
| `lit/ds-prototype` | `@canonical/lit-ds-prototype` | same |

## `packages/storybook`: Everything Storybook

The addons that extend Storybook for this repository, the shared helpers stories use, and the configuration factory every Storybook here builds on.

The factory (`storybook/config`) is in this domain rather than in `configs/` because of what it depends on: `@canonical/ds-assets`, `@canonical/styles-debug` and two of the addons beside it, composed into a running Storybook. Nothing in `configs/` reaches into the design system, and this does. It belongs with the packages it depends on.

Stories themselves are not here. A story lives beside the component it documents.

| Folder | npm name | Folder-derived |
|---|---|---|
| `storybook/config` | `@canonical/storybook-config` | same |
| `storybook/helpers` | `@canonical/storybook-helpers` | same |
| `storybook/addon-msw` | `@canonical/storybook-addon-msw` | same |
| `storybook/addon-relay` | `@canonical/storybook-addon-relay` | same |
| `storybook/addon-utils` | `@canonical/storybook-addon-utils` | same |
| `storybook/addon-form-state` | `@canonical/storybook-addon-form-state` | same |
| `storybook/addon-canonical-shell-theme` | `@canonical/storybook-addon-shell-theme` | `storybook-addon-canonical-shell-theme` |

## `packages/runtime`: Framework-Agnostic Engines

Libraries that hold logic rather than markup, and that more than one consumer needs. Two kinds live here: the engines the framework bindings are built on (`router`, `i18n`, `ds-utils`) and the runtimes the tooling is built on (`task`, `ke`, `ke-graphql`, `harnesses`).

The test is dependency-freedom: nothing in this domain may import React, Svelte or Lit. A package that needs a framework belongs in that framework's domain.

| Folder | npm name | Folder-derived |
|---|---|---|
| `runtime/router` | `@canonical/router-core` | `runtime-router` |
| `runtime/i18n` | `@canonical/i18n-core` | `runtime-i18n` |
| `runtime/ds-utils` | `@canonical/ds-utils` | `runtime-ds-utils` |
| `runtime/task` | `@canonical/task` | `runtime-task` |
| `runtime/ke` | `@canonical/ke` | `runtime-ke` |
| `runtime/ke-graphql` | `@canonical/ke-graphql` | `runtime-ke-graphql` |
| `runtime/harnesses` | `@canonical/harnesses` | `runtime-harnesses` |

Every name in this domain disagrees with its folder, for the same reason. The names say what the thing *is* (`task`, `ke`, the `-core` half of a pair); the folder says where the thing may not reach.

## `packages/contracts`: The Shared Type Contracts

Types that more than one package must agree on. Modifier families, grid definitions, navigation shapes: the vocabulary a React component and a Svelte component have to share in order to be the same component in two languages.

A contract is mostly types, but not only types. Where the set of allowed values *is* the contract, it is declared once as an `as const` literal and the types are derived from it, so that a story's `argTypes`, a Storybook matrix or a runtime guard can enumerate exactly the values the type checker enforces. `MODIFIER_FAMILIES` and `GRID_PRESETS` in `ds-types` are the two such literals today, and both are read at runtime by consumers. That is the whole of the runtime this domain allows: frozen data a type is derived from, and nothing else.

What does not belong: types used by exactly one package (they belong in that package's `types.ts`), and code with behaviour — functions, classes, anything with a side effect. A helper that *operates* on a contract is an engine, and belongs in `packages/runtime/`.

| Folder | npm name | Folder-derived |
|---|---|---|
| `contracts/ds-types` | `@canonical/ds-types` | `contracts-ds-types` |

## `packages/assets`: The Static Assets

Files that are shipped rather than executed: the icon set, the Ubuntu Sans font files, and the small amount of TypeScript needed to enumerate and type them. An icon is content. It is not a component in any framework, and copying it into each framework's package would make it three things instead of one.

What does not belong: anything that renders. The React `Icon` component that consumes this set lives in `packages/react/ds-global`.

| Folder | npm name | Folder-derived |
|---|---|---|
| `assets/ds-assets` | `@canonical/ds-assets` | `assets-ds-assets` |

## `packages/semantics`: The Design System as Data

The machine-readable description of the design system: which library implements which block, in which framework, with a source link. The data is RDF (Turtle), generated from `@implements` annotations across the repository by `bun run collect` into the root `data/` directory, and published as a pack the `pragma` CLI and its MCP server can query.

This is the domain for meaning about the design system, not the domain for design-system code. What does not belong: anything that renders or executes. A package here describes other packages.

| Folder | npm name | Folder-derived |
|---|---|---|
| `semantics/ds-implementations` | `@canonical/ds-implementations` | `semantics-ds-implementations` |

## `packages/cli`: The Shipped Binaries

The two commands a consumer installs and runs: `pragma` (the design-system CLI and MCP server) and `summon` (the interactive code generator).

What does not belong: the machinery a binary is assembled from. The generator framework is in `packages/summon/`, the effect runtime in `packages/runtime/`.

| Folder | npm name | Folder-derived |
|---|---|---|
| `cli/pragma` | `@canonical/pragma-cli` | `cli-pragma` |
| `cli/summon` | `@canonical/summon` | `cli-summon` |

## `packages/summon`: The Code-Generation Framework

The generator framework and the generator packages it discovers. Splitting the binary from the generators means a consumer can install one generator without installing all of them, and means `pragma create` can mount the same generator tree under a different binary.

What does not belong: the binaries themselves — they are in `packages/cli/`.

| Folder | npm name | Folder-derived |
|---|---|---|
| `summon/core` | `@canonical/summon-core` | same |
| `summon/component` | `@canonical/summon-component` | same |
| `summon/package` | `@canonical/summon-package` | same |
| `summon/application` | `@canonical/summon-application` | same |
| `summon/monorepo` | `@canonical/summon-monorepo` | same |

## `configs`: The Shared Configuration Packages

Not under `packages/`, and deliberately so. What these have in common is what they are allowed to know: nothing about the design system. Their only workspace dependencies are each other. They configure the toolchain, which is a concern the repository has but the design system does not, so they sit at the root rather than under a design-system domain.

How they are consumed varies, and is not the line. Six are inherited by name — a package puts one in `extends`, in its `tsconfig.json`, its `biome.json`, or Renovate's — while `vitest-config-react` is a factory a package imports and calls. Either way, what the package gets back is toolchain settings and nothing else.

What does not belong: anything that depends on a design-system package. That is the line `storybook/config` fell on the far side of — it is a factory too, but one that pulls in the icons, the debug styles and two addons.

Their names follow a second, equally consistent rule: `<tool>-config`, with a flavour suffix where a tool needs one per framework.

| Folder | npm name |
|---|---|
| `configs/biome` | `@canonical/biome-config` |
| `configs/typescript` | `@canonical/typescript-config` |
| `configs/typescript-react` | `@canonical/typescript-config-react` |
| `configs/typescript-svelte` | `@canonical/typescript-config-svelte` |
| `configs/typescript-lit` | `@canonical/typescript-config-lit` |
| `configs/vitest-config-react` | `@canonical/vitest-config-react` |
| `configs/renovate` | `@canonical/renovate-config` |

`vitest-config-react` is the one folder that does not follow the rule; under it the folder would be `configs/vitest-react`.

## `apps`: The Internal Surfaces

Development and demo applications. None are published; all are workspace members, so they build against the working tree rather than the registry, which is what makes them useful as the first consumer of a change. They are grouped by the framework they are written in, mirroring `packages/`.

What does not belong: anything a consumer would install. Code that proves reusable moves into a package before a second app copies it.

| Folder | npm name |
|---|---|
| `apps/react/demo` | `@canonical/ds-demo-site` |
| `apps/react/boilerplate-vite` | `@canonical/react-boilerplate-vite` |
| `apps/react/storybook-hub` | `@canonical/storybook-hub` |
| `apps/lit/demo` | `@canonical/lit-demo` |

## Packages Without a Domain

Two packages sit directly in `packages/`, outside every domain:

| Folder | npm name |
|---|---|
| `packages/utils` | `@canonical/utils` |
| `packages/webarchitect` | `@canonical/webarchitect` |

Both are general-purpose engineering tools rather than design-system code. `utils` is a set of framework-neutral string and assertion helpers; `webarchitect` is the architecture linter whose rulesets most packages' `check` script runs. Neither serves a design-system concern, so there is no folder here that could name one.

What does not belong: anything else. These two are a residue, not a bin. A new tool that fits no existing domain is a sign that a domain is missing, not a reason to add a third loose package — propose the domain instead.

## Adding a Domain

A new domain is a claim that a concern exists and that this repository holds more than one thing that serves it — or that it holds exactly one thing whose concern is genuinely distinct from every existing domain. It is cheap to add and expensive to undo, because the folder name is repeated in CI path filters, workspace globs, `.github/CODEOWNERS` and every link that names a file under it.

A new domain directory is also invisible to the workspace until a glob matches it, and nothing in the repository will say so; [adding a package](../how-to-guides/ADDING_A_PACKAGE.md#a-new-domain-directory-needs-a-new-workspace-glob) explains why that failure is so hard to diagnose and how to verify the fix.

A new domain needs a section here too. Without one the folder names a concern that only its author can state, which is the failure the domain layout exists to prevent.
