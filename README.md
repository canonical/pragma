# Pragma

Pragma is Canonical's implementation of the [Design System](https://github.com/canonical/design-system). It provides components, CSS styles, and developer tooling for building consistent user interfaces across Canonical's web properties. React and Svelte 5 are the supported frameworks.

## Quick Start

Clone the repository and install dependencies. The installation step also builds all packages, which takes roughly 30 seconds on first run.

```bash
git clone https://github.com/canonical/pragma
cd pragma
bun install
```

See [Storybook](#storybook) below for how to run a package's Storybook server and which port it uses.

## Prerequisites

**Required:**

- **Bun 1.3.9 or later** for package management and script execution.

  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

- **React 19 or later** for component packages (Svelte 5 for Svelte packages).

- **Node.js 22.12 or 24** using nvm for Storybook and Lerna.

  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
  nvm install 24 && nvm use 24
  ```

**Recommended:**

- **MCP-capable environment** such as Claude Code, Cursor, or Windsurf. The repository includes an `.mcp.json` configuration that enables AI assistants to query the codebase semantically, access Nx workspace intelligence, and retrieve up-to-date documentation.
- **Summon generators** for scaffolding new applications, packages, and components. The
  `@canonical/summon` CLI is the framework: it runs under plain Node (no Bun required) and
  ships only with an example generator plus `summon init` (to scaffold your own generator):
  ```bash
  npm install -g @canonical/summon   # or: bun add -g @canonical/summon
  ```
  The real generators live in their own packages; install the ones you need into the same
  location and Summon discovers them automatically:
  ```bash
  npm install -g @canonical/summon-application   # summon application / domain / route / wrapper
  npm install -g @canonical/summon-component     # summon component
  ```
  Then use `summon application react my-app` to scaffold an app,
  `summon component react src/lib/MyComponent` to scaffold components, or `summon --help` for
  all installed generators.
  (To iterate on the generators from this monorepo, run `bun packages/cli/summon/dist/src/bin.js`
  after `bun run build`, or `bun link` the built package.)


**Nice to have:**

- **Lerna installed globally** for running workspace-wide commands directly.

  ```bash
  npm install -g lerna
  ```

**Notes:**

- Node 22.x earlier than 22.12 have module resolution issues.
- Node 23 has a [known compatibility issue](https://github.com/canonical/pragma/issues/226) and should be avoided.
- Installing Node via the snap package is not recommended as it may cause build issues.
- Installing Bun via the snap package is not recommended as it may cause permission issues. This is a known [issue](https://github.com/shakeelansari63/snap-packages/issues/79). Use the official installation script instead.


## Storybook

Storybook runs per-package rather than at the monorepo root. Navigate to a component package and start its Storybook server to see the components in action.

```bash
cd packages/react/ds-global
bun run storybook
```

Each component package has its own Storybook configuration with package-specific stories and documentation.

Ports are pooled by tier rather than assigned one-per-package, since it's unlikely you'd run two packages from the same pool at once. If you do, Storybook autodetects the collision and picks the next free port.

When adding a new Storybook-enabled package, assign it to the pool matching its tier below. Only reach for a new port if it genuinely doesn't fit an existing pool.

| Pool | Port | Package | Path |
|------|------|---------|------|
| Storybook addons | 6005 | `@canonical/storybook-addon-msw` | `packages/storybook/addon-msw` |
| Storybook addons | 6005 | `@canonical/storybook-addon-utils` | `packages/storybook/addon-utils` |
| Global | 6006 | `@canonical/react-ds-global` | `packages/react/ds-global` |
| Global | 6006 | `@canonical/svelte-ds-global` | `packages/svelte/ds-global` |
| Form | 6007 | `@canonical/react-ds-global-form` | `packages/react/ds-global-form` |
| App packages | 6008 | `@canonical/react-ds-app` | `packages/react/ds-app` |
| App packages | 6008 | `@canonical/react-ds-app-anbox` | `packages/react/ds-app-anbox` |
| App packages | 6008 | `@canonical/react-ds-app-landscape` | `packages/react/ds-app-landscape` |
| App packages | 6008 | `@canonical/react-ds-app-launchpad` | `packages/react/ds-app-launchpad` |
| App packages | 6008 | `@canonical/react-ds-app-lxd` | `packages/react/ds-app-lxd` |
| App packages | 6008 | `@canonical/react-ds-app-portal` | `packages/react/ds-app-portal` |
| App packages | 6008 | `@canonical/svelte-ds-app` | `packages/svelte/ds-app` |
| App packages | 6008 | `@canonical/svelte-ds-app-launchpad` | `packages/svelte/ds-app-launchpad` |
| App packages | 6008 | `@canonical/svelte-ds-app-wpe` | `packages/svelte/ds-app-wpe` |
| Apps | 6009 | `@canonical/react-boilerplate-vite` | `apps/react/boilerplate-vite` |
| Apps | 6009 | `@canonical/ds-demo-site` | `apps/react/demo` |
| Apps | 6009 | `@canonical/react-tokens` | `packages/react/tokens` |
| Apps | 6009 | `@canonical/lit-ds-prototype` | `packages/lit/ds-prototype` |
| Hub | 6100 | `@canonical/storybook-hub` | `apps/react/storybook-hub` |

## Repository Structure

The monorepo uses Lerna for versioning and publishing, with Nx providing task caching and dependency-aware execution. Lerna keeps package versions in lockstep (currently the 0.29.x line, tracked in [`lerna.json`](lerna.json)) to eliminate compatibility matrices between internal dependencies.

A guiding principle throughout the codebase is that structure should be discoverable by both humans and machines. This means explicit conventions rather than hidden magic, schema-validated configurations, and specifications expressed as queryable data where possible.

### Component Tiers

React components are organised into tiers based on their scope of applicability. The tier indicates how specific a component is to a particular application domain, not a dependency hierarchy. Any application can consume components from any tier.

| Tier | Package | Scope |
|------|---------|-------|
| Global | `@canonical/react-ds-global` | Universal components like Button, Badge, Card, and Chip that apply across all contexts. Production-ready components live under `src/lib/component`, `src/lib/group`, and `src/lib/pattern`; early-stage work sits in `src/lib/_work_in_progress`. |
| Global Form | `@canonical/react-ds-global-form` | Form controls including Input, Select, and Checkbox, along with validation patterns. See the [package README](packages/react/ds-global-form/README.md) for usage and guides. |
| Apps | `@canonical/react-ds-app` | Application-level UI such as ApplicationLayout, SideNavigation, and ContentLayout, suited for internal tools. |
| Apps (product-specific) | `@canonical/react-ds-app-*` | Components specific to a single product: Launchpad (`-launchpad`), LXD (`-lxd`), Anbox (`-anbox`), Landscape (`-landscape`), and Portal (`-portal`). |

The tiers correspond to the [Design System Ontology](https://github.com/canonical/design-system), which models the design system as structured, queryable data. Each component has a formal specification including usage guidelines, modifier families, and anatomy definitions. This semantic approach enables tooling to understand design intent, not just implementation details.

### Core Infrastructure

Three packages provide the foundation that component packages build upon.

**@canonical/ds-types** defines TypeScript types for modifier families. A modifier family is a set of related visual variants that components can support. For example, the `severity` modifier family includes `neutral`, `positive`, `negative`, `caution`, and `information`. The `ModifierFamily<'severity'>` type resolves to a union of these string literals, ensuring type safety when applying modifiers to components.

**@canonical/ds-assets** contains icons and shared visual assets. Icons use `currentColor` for fill, allowing them to inherit text colour from their context, and a 16x16 viewBox as the standard size.

**@canonical/utils** provides battle-tested utility functions like `debounce` and `throttle`. Functions only enter this package after proving useful across multiple packages; premature abstraction is actively avoided.

### Styles Architecture

Pragma uses pure CSS with no preprocessors, no CSS-in-JS, and no build-time transformations beyond standard bundling. The stylesheets you write are the stylesheets that ship. This decision keeps the styling system understandable to anyone who knows CSS, eliminates runtime overhead from style injection, and ensures styles work correctly during server-side rendering without hydration concerns.

The CSS architecture uses layered imports rather than a monolithic stylesheet. **@canonical/styles** (at `packages/styles/main`) is the aggregator package that imports all style layers in the correct order. Applications typically import only this package.

The layers build upon each other: normalize.css provides the reset, **@canonical/styles-typography** supplies the baseline-grid alignment engine and typography scale tokens, and generated tokens from `@canonical/design-tokens` define colour, spacing, surface, and state custom properties, followed by grid, spacing, overflow, and motion tokens. **@canonical/styles-debug** offers opt-in development aids such as a baseline grid overlay.

Component styles live with their components rather than in the styles packages. Each component imports its own `styles.css` file, which uses CSS custom properties that reference the design tokens. This co-location keeps styles maintainable and allows tree-shaking of unused component styles. The Button component, for example, defines its colours through custom properties like `--button-color-background` that can be overridden by consumers or themed through modifier classes.

### Developer Tooling

**@canonical/webarchitect** validates that packages conform to architectural standards. Rather than enforcing conventions through runtime magic, it uses JSON Schema-based rulesets to verify package.json structure, TypeScript configuration, Biome setup, and license compliance. Most packages run `bun run check:webarchitect` as part of their check script. The schemas serve as executable documentation: they describe what valid structure looks like while simultaneously enforcing it.

Three rulesets cover the common cases. The `library` ruleset targets reusable packages (LGPL-3.0 licensing by default). The `tool` ruleset targets CLI tools and applications (GPL-3.0). The `tool-ts` ruleset handles TypeScript-only tools that run directly with Bun without a build step. Further rulesets (`base`, `package`, `package-react`, `package-svelte`, `assets`) cover specialised cases; see [`packages/webarchitect/rulesets`](packages/webarchitect/rulesets).

**Summon** scaffolds new code. The `@canonical/summon` CLI (at `packages/cli/summon`) is a small framework that discovers generator packages installed alongside it: `@canonical/summon-component` scaffolds React, Svelte, and Lit components (`summon component react src/lib/MyComponent`), `@canonical/summon-package` scaffolds monorepo packages, `@canonical/summon-application` scaffolds applications, domains, routes, and wrappers, and `@canonical/summon-monorepo` scaffolds entire monorepos — all built on the `@canonical/summon-core` framework (`packages/summon/*`). The component generator creates the component file, types, styles, stories, unit tests, and SSR tests following the [standard structure](docs/explanations/COMPONENT_FOLDER_STRUCTURE.md). The `pragma` CLI wraps the component and package generators as `pragma create component` and `pragma create package`, adding `--undo` support to reverse a scaffold. See the [Prerequisites](#prerequisites) section for installation.

## Component Structure

Every React component follows the same folder structure. This consistency means that understanding one component teaches you how to navigate all components. See the [component folder structure guide](docs/explanations/COMPONENT_FOLDER_STRUCTURE.md) for detailed conventions.

```
Button/
├── Button.tsx           # Component implementation
├── types.ts             # Props interface extending HTML attributes
├── styles.css           # Component styles using CSS custom properties
├── index.ts             # Barrel export with explicit named exports
├── Button.stories.tsx   # Storybook stories for documentation and testing
├── Button.tests.tsx     # Unit tests using Vitest and Testing Library
└── Button.ssr.tests.tsx # Server-side rendering tests
```

The component file imports its types and styles, then exports a function component. Props interfaces extend the appropriate HTML attributes interface (e.g., `ButtonHTMLAttributes<HTMLButtonElement>`) to ensure all native attributes pass through correctly.

Styles use a `ds` namespace class combined with the component name, baseline utilities, modifier props, and state classes. Button, for example, composes `className={["ds button", "p", importance, anticipation, variant, loading && "loading", className].filter(Boolean).join(" ")}` — the `p` baseline utility, the `importance`/`anticipation`/`variant` modifiers, and a `loading` state class. This pattern allows modifier classes to apply directly while preserving any custom classes passed by consumers.

The barrel export in `index.ts` explicitly names every export rather than using `export *`. This makes the public API visible at a glance and enables precise tree-shaking.

SSR tests verify that components render correctly on the server without accessing browser APIs. They catch issues like missing `window` checks or non-deterministic IDs that cause hydration mismatches. The [component folder structure guide](docs/explanations/COMPONENT_FOLDER_STRUCTURE.md) covers file naming and export conventions in detail.

## Development Workflow

After making changes, run the full check suite before committing.

```bash
bun run check
```

This command runs Biome for linting and formatting, TypeScript for type checking, and webarchitect for architecture validation. The check runs across all packages via Lerna, with Nx caching unchanged packages.

To run tests across all packages:

```bash
bun run test
```

For focused development on a single package, navigate to that package and use its scripts directly. Most packages provide `bun run storybook` for interactive development and `bun run test:vitest:watch` for test-driven development.

> **Hint:** Use `bunx` instead of `npx` to run package binaries. This ensures the locally installed versions are used rather than potentially stale global npm caches.

## CI/CD

Pull requests trigger a build matrix that tests against Node 22 and Node 24. The workflow builds all packages, runs checks, and executes tests. All matrix jobs must pass before merge.

Chromatic workflows run visual regression tests for component packages. Each Storybook package has a dedicated Chromatic workflow filtered by path, so changes to `react-ds-global` only trigger visual tests for that package. This conserves Chromatic snapshots while ensuring visual changes are reviewed.

The release workflow runs manually from GitHub Actions. It prompts for a release type (experimental, alpha, beta, rc, or stable), runs the full test suite, bumps versions using Lerna's conventional commit analysis, and publishes to npm. See the [versioning guide](docs/VERSIONING.md) for commit message format and release process details.

See the [webarchitect documentation](packages/webarchitect/README.md) for details on architecture validation and ruleset configuration.

## Documentation

The `docs/` folder contains guides for working with the monorepo:

| Guide | Description |
|-------|-------------|
| [Constitution](CONSTITUTION.md) | Design principles and decision rationale |
| [Component Folder Structure](docs/explanations/COMPONENT_FOLDER_STRUCTURE.md) | Standard component anatomy and conventions |
| [Adding a Package](docs/how-to-guides/ADDING_A_PACKAGE.md) | How to create new packages in the monorepo |
| [Versioning](docs/VERSIONING.md) | Commit message format and release process |
| [CI/CD](docs/CI.md) | Continuous integration and deployment workflows |
| [Code Ownership](docs/OWNERSHIP.md) | What does it mean to own a package |

## Package Reference

The following tables list all workspace packages with their location and purpose. Packages marked **internal** have `"private": true` in their package.json and are not published to npm.

### React Components

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/react-ds-global` | `packages/react/ds-global` | Global tier components: Accordion, Announcement, Badge, Breadcrumbs, Button, Card, Chip, ContextualMenu, Heading, Icon, InlineCode, KeyboardKey, KeyboardKeys, Popover, Tabs, Tile, Timeline, Tooltip |
| `@canonical/react-ds-global-form` | `packages/react/ds-global-form` | Form components with react-hook-form integration. See [README](packages/react/ds-global-form/README.md) for guides |
| `@canonical/react-ds-app` | `packages/react/ds-app` | Application tier components: ApplicationLayout, ContentLayout, SideNavigation, ViewLayout |
| `@canonical/react-ds-app-anbox` | `packages/react/ds-app-anbox` | Anbox-specific components |
| `@canonical/react-ds-app-landscape` | `packages/react/ds-app-landscape` | Landscape-specific components |
| `@canonical/react-ds-app-launchpad` | `packages/react/ds-app-launchpad` | Launchpad-specific components: GitDiffViewer, MarkdownEditor, FileTree, EditableBlock, RelativeTime, DiffChangeMarker |
| `@canonical/react-ds-app-lxd` | `packages/react/ds-app-lxd` | LXD-specific components |
| `@canonical/react-ds-app-portal` | `packages/react/ds-app-portal` | Portal-specific components |

### React Utilities

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/react-ssr` | `packages/react/ssr` | Server-side rendering utilities |
| `@canonical/ssr-adapter-cloudflare` | `packages/react/ssr-adapter-cloudflare` | Cloudflare Workers adapter for `@canonical/react-ssr` (**internal**) |
| `@canonical/ssr-adapter-deno` | `packages/react/ssr-adapter-deno` | Deno Deploy adapter for `@canonical/react-ssr` (**internal**) |
| `@canonical/ssr-adapter-vercel` | `packages/react/ssr-adapter-vercel` | Vercel deployment adapter for `@canonical/react-ssr` (**internal**) |
| `@canonical/react-head` | `packages/react/head` | Declarative head management for React with SSR collection |
| `@canonical/react-hooks` | `packages/react/hooks` | Shared React hooks: preferences, navigation tree |
| `@canonical/i18n-react` | `packages/react/i18n` | React bindings for `@canonical/i18n-core`: I18nProvider plus useTranslation, useLocale, and useFormatters hooks |
| `@canonical/router-react` | `packages/react/router` | React bindings for `@canonical/router-core` |
| `@canonical/react-tokens` | `packages/react/tokens` | Token explorer components (TokenTable, TokenSwatch) for browsing design tokens in Storybook |

### Svelte Components

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/svelte-ds-global` | `packages/svelte/ds-global` | Global components for Svelte 5 |
| `@canonical/svelte-ds-app` | `packages/svelte/ds-app` | App components for Svelte 5 |
| `@canonical/svelte-ds-app-launchpad` | `packages/svelte/ds-app-launchpad` | Launchpad-specific Svelte components |
| `@canonical/svelte-ds-app-wpe` | `packages/svelte/ds-app-wpe` | WPE-specific Svelte components |
| `@canonical/svelte-ssr-test` | `packages/svelte/ssr-test` | Test package for Svelte SSR testing |

### Web Components

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/lit-ds-prototype` | `packages/lit/ds-prototype` | Prototype Web Components built with Lit |

### Styles

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/styles` | `packages/styles/main` | Global stylesheet aggregating normalize.css, typography, and design tokens |
| `@canonical/styles-typography` | `packages/styles/typography` | Typography baseline alignment engines and scale tokens |
| `@canonical/styles-debug` | `packages/styles/debug` | Development aids including baseline grid overlay |

### Runtime

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/ke` | `packages/runtime/ke` | Headless triple store runtime built on Oxigraph WASM |
| `@canonical/ke-graphql` | `packages/runtime/ke-graphql` | OWL to GraphQL compiler for the ke triple store |
| `@canonical/router-core` | `packages/runtime/router` | Framework-agnostic router core built on flat route triplets |
| `@canonical/i18n-core` | `packages/runtime/i18n` | Framework-agnostic internationalization core built on native Intl |
| `@canonical/task` | `packages/runtime/task` | Monadic effect framework for composable, testable, dry-runnable CLI operations |
| `@canonical/harnesses` | `packages/runtime/harnesses` | AI harness detection and MCP config read/write (Claude Code, Cursor, Windsurf, Cline, Roo Code) |

### Core Infrastructure

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/ds-types` | `packages/ds-types` | TypeScript types for modifier families and component props |
| `@canonical/ds-assets` | `packages/ds-assets` | Icons and shared visual assets |
| `@canonical/utils` | `packages/utils` | Utility functions: debounce, throttle, casing, pluralize, and more |

### Developer Tooling

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/webarchitect` | `packages/webarchitect` | Architecture validation CLI with JSON Schema rulesets |
| `@canonical/pragma-cli` | `packages/cli/pragma` | CLI and MCP server for querying the design system |
| `@canonical/cli-core` | `packages/cli/core` | Shared CLI machinery: command definitions, registration, completions, output adapters |
| `@canonical/summon` | `packages/cli/summon` | Interactive code generator CLI with Ink UI and shell completion |
| `@canonical/summon-core` | `packages/summon/core` | Code generation framework: generator definitions, templates, discovery |
| `@canonical/summon-component` | `packages/summon/component` | React, Svelte, and Lit component generators |
| `@canonical/summon-package` | `packages/summon/package` | Package generator for scaffolding npm packages |
| `@canonical/summon-application` | `packages/summon/application` | Application scaffolding generators: application, domain, route, wrapper |
| `@canonical/summon-monorepo` | `packages/summon/monorepo` | Monorepo generator: Bun + Lerna monorepos with CI and shared config |

### Storybook

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/storybook-addon-msw` | `packages/storybook/addon-msw` | Mock Service Worker integration for Storybook |
| `@canonical/storybook-addon-utils` | `packages/storybook/addon-utils` | Debug and layout utilities: grid mode, color scheme, baseline grid, outlines |
| `@canonical/storybook-addon-form-state` | `packages/storybook/addon-form-state` | Panel displaying live react-hook-form state |
| `@canonical/storybook-addon-relay` | `packages/storybook/addon-relay` | Renders stories that use Relay hooks against a mock Relay environment |
| `@canonical/storybook-addon-shell-theme` | `packages/storybook/addon-canonical-shell-theme` | Applies the Canonical shell theme with light and dark modes |
| `@canonical/storybook-helpers` | `packages/storybook/helpers` | Shared Storybook utilities and helper components |

### Configuration

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/biome-config` | `configs/biome` | Shared Biome configuration for linting and formatting |
| `@canonical/renovate-config` | `configs/renovate` | Shared Renovate configuration for Canonical monorepos |
| `@canonical/typescript-config` | `configs/typescript` | Base TypeScript configuration |
| `@canonical/typescript-config-react` | `configs/typescript-react` | TypeScript configuration extending base with React settings |
| `@canonical/typescript-config-lit` | `configs/typescript-lit` | TypeScript configuration for Lit Web Components projects |
| `@canonical/typescript-config-svelte` | `configs/typescript-svelte` | TypeScript configuration for Svelte projects |
| `@canonical/storybook-config` | `configs/storybook` | Shared Storybook configuration factory |
| `@canonical/vitest-config-react` | `configs/vitest-config-react` | Shared Vitest configuration factory for React packages |

### Apps (internal)

These workspace apps are development and demo surfaces; none are published.

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/ds-demo-site` | `apps/react/demo` | Design system demo site |
| `@canonical/react-boilerplate-vite` | `apps/react/boilerplate-vite` | React application scaffold with SSR on Canonical's shared packages |
| `@canonical/storybook-hub` | `apps/react/storybook-hub` | Aggregated Storybook hub |
| `@canonical/lit-demo` | `apps/lit/demo` | Minimal SSR demo for the Lit prototype |

## Acknowledgements

Thanks to [Chromatic](https://www.chromatic.com/) for providing the visual testing platform that helps us review UI changes and catch visual regressions.
