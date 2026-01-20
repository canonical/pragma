# Pragma

Pragma is Canonical's implementation of the [Design System](https://github.com/canonical/design-system). It provides components, CSS styles, and developer tooling for building consistent user interfaces across Canonical's web properties. React and Svelte 5 are the supported frameworks.

## Quick Start

Clone the repository and install dependencies. The installation step also builds all packages, which takes roughly 30 seconds on first run.

```bash
git clone https://github.com/canonical/pragma
cd pragma
bun install
```

Storybook runs per-package rather than at the monorepo root. Navigate to a component package and start its Storybook server to see the components in action.

```bash
cd packages/react/ds-global
bun run storybook
```

The server starts at http://localhost:6006. Each component package has its own Storybook configuration with package-specific stories and documentation.

## Prerequisites

**Required:**

- **React 19** or later for component packages (Svelte 5 for Svelte packages)
- **Bun 1.3** or later for package management and script execution
- **Node.js 22.12 or 24** because Storybook and Lerna depend on Node internals that Bun does not yet fully support. Node 22.12 specifically is required as earlier 22.x versions have module resolution issues.

Node 23 has a [known compatibility issue](https://github.com/canonical/pragma/issues/226) and should be avoided.

**Recommended:**

- **MCP-capable environment** such as Claude Code, Cursor, or Windsurf. The repository includes an `.mcp.json` configuration that enables AI assistants to query the codebase semantically, access Nx workspace intelligence, and retrieve up-to-date documentation.
- **Summon generators** for scaffolding new components and packages. Install globally with `bun link` from each package directory:
  ```bash
  cd packages/summon && bun link
  cd packages/summon-component && bun link
  cd packages/summon-package && bun link
  ```
  Then use `summon component react src/lib/MyComponent` to scaffold components or `summon package` to create new packages. Run `summon --help` for all available generators.

**Nice to have:**

- **Lerna installed globally** (`npm install -g lerna`) for running workspace-wide commands directly

Install Bun with `curl -fsSL https://bun.sh/install | bash`. Install Node via nvm with `nvm install 24 && nvm use 24`.

## Repository Structure

The monorepo uses Lerna for versioning and publishing, with Nx providing task caching and dependency-aware execution. All packages share a single version number (currently 0.11.0) to eliminate compatibility matrices between internal dependencies.

A guiding principle throughout the codebase is that structure should be discoverable by both humans and machines. This means explicit conventions rather than hidden magic, schema-validated configurations, and specifications expressed as queryable data where possible.

### Component Tiers

React components are organised into tiers based on their scope of applicability. The tier indicates how specific a component is to a particular application domain, not a dependency hierarchy. Any application can consume components from any tier.

| Tier | Package | Scope |
|------|---------|-------|
| Global | `@canonical/react-ds-global` | Universal components like Button, Badge, Card, and Chip that apply across all contexts. |
| Global Form | `@canonical/react-ds-global-form` | Form controls including Input, Select, and Checkbox, along with validation patterns. See [creating custom fields](packages/react/ds-global-form/docs/creating-custom-fields.md) and [creating middleware](packages/react/ds-global-form/docs/creating-middleware.md). |
| Apps | `@canonical/react-ds-app` | Application-level UI such as Navigation and Toolbar, suited for internal tools. |
| Apps/WPE | `@canonical/react-ds-app-launchpad` | Components specific to Launchpad and WordPress Engine applications. |

The tiers correspond to the [Design System Ontology](https://github.com/canonical/design-system), which models the design system as structured, queryable data. Each component has a formal specification including usage guidelines, modifier families, and anatomy definitions. This semantic approach enables tooling to understand design intent, not just implementation details.

### Core Infrastructure

Three packages provide the foundation that component packages build upon.

**@canonical/ds-types** defines TypeScript types for modifier families. A modifier family is a set of related visual variants that components can support. For example, the `severity` modifier family includes `neutral`, `positive`, `negative`, `caution`, and `information`. The `ModifierFamily<'severity'>` type resolves to a union of these string literals, ensuring type safety when applying modifiers to components.

**@canonical/ds-assets** contains icons and shared visual assets. Icons use a consistent 16x16 viewBox with `currentColor` for fill, allowing them to inherit text colour from their context.

**@canonical/utils** provides battle-tested utility functions like `debounce` and `throttle`. Functions only enter this package after proving useful across multiple packages; premature abstraction is actively avoided.

### Styles Architecture

Pragma uses pure CSS with no preprocessors, no CSS-in-JS, and no build-time transformations beyond standard bundling. The stylesheets you write are the stylesheets that ship. This decision keeps the styling system understandable to anyone who knows CSS, eliminates runtime overhead from style injection, and ensures styles work correctly during server-side rendering without hydration concerns.

The CSS architecture uses layered packages rather than a monolithic stylesheet. **@canonical/styles** is the aggregator package that imports all style layers in the correct order. Applications typically import only this package.

The layers build upon each other: **styles-primitives-canonical** defines raw design tokens as CSS custom properties, **styles-elements** provides base HTML element styling (built on normalize.css), and the **styles-modes-*** packages handle theming concerns like colour modes, density variants, and motion preferences.

Component styles live with their components rather than in the styles packages. Each component imports its own `styles.css` file, which uses CSS custom properties that reference the design tokens. This co-location keeps styles maintainable and allows tree-shaking of unused component styles. The Button component, for example, defines its colours through custom properties like `--button-color-background` that can be overridden by consumers or themed through modifier classes.

### Developer Tooling

**@canonical/webarchitect** validates that packages conform to architectural standards. Rather than enforcing conventions through runtime magic, it uses JSON Schema-based rulesets to verify package.json structure, TypeScript configuration, Biome setup, and license compliance. Every package runs `bun run check:webarchitect` as part of its check script. The schemas serve as executable documentation: they describe what valid structure looks like while simultaneously enforcing it.

Three rulesets cover the common cases. The `library` ruleset enforces LGPL-3.0 licensing for reusable packages. The `tool` ruleset enforces GPL-3.0 for CLI tools and applications. The `tool-ts` ruleset handles TypeScript-only tools that run directly with Bun without a build step.

**@canonical/generator-ds** scaffolds new components using Yeoman. Install it globally with `npm install -g yo @canonical/generator-ds`, then run `yo @canonical/ds:component src/MyComponent` from within a package directory. The generator creates the component file, types, styles, stories, unit tests, and SSR tests following the [standard structure](docs/component-folder-structure-and-conventions.md).

## Component Structure

Every React component follows the same folder structure. This consistency means that understanding one component teaches you how to navigate all components. See the [component folder structure guide](docs/component-folder-structure-and-conventions.md) for detailed conventions.

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

Styles use a `ds` namespace class combined with the component name: `className={["ds", "button", appearance, className].filter(Boolean).join(" ")}`. This pattern allows modifier classes to apply directly while preserving any custom classes passed by consumers.

The barrel export in `index.ts` explicitly names every export rather than using `export *`. This makes the public API visible at a glance and enables precise tree-shaking.

SSR tests verify that components render correctly on the server without accessing browser APIs. They catch issues like missing `window` checks or non-deterministic IDs that cause hydration mismatches. The [component folder structure guide](docs/component-folder-structure-and-conventions.md) covers file naming and export conventions in detail.

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

## CI/CD

Pull requests trigger a build matrix that tests against Node 22 and Node 24. The workflow builds all packages, runs checks, and executes tests. All matrix jobs must pass before merge.

Chromatic workflows run visual regression tests for component packages. Each Storybook package has a dedicated Chromatic workflow filtered by path, so changes to `react-ds-global` only trigger visual tests for that package. This conserves Chromatic snapshots while ensuring visual changes are reviewed.

The release workflow runs manually from GitHub Actions. It prompts for a release type (experimental, alpha, beta, rc, or stable), runs the full test suite, bumps versions using Lerna's conventional commit analysis, and publishes to npm. See the [versioning guide](docs/versioning.md) for commit message format and release process details.

See the [webarchitect documentation](packages/webarchitect/README.md) for details on architecture validation and ruleset configuration.

## Documentation

The `docs/` folder contains guides for working with the monorepo:

| Guide | Description |
|-------|-------------|
| [Philosophy](docs/philosophy.md) | Design principles and decision rationale |
| [Component Folder Structure](docs/component-folder-structure-and-conventions.md) | Standard component anatomy and conventions |
| [Adding a Package](docs/adding-a-package.md) | How to create new packages in the monorepo |
| [Versioning](docs/versioning.md) | Commit message format and release process |
| [CI/CD](docs/ci.md) | Continuous integration and deployment workflows |

## Package Reference

The following table lists all packages in the monorepo with their location and purpose.

### React Components

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/react-ds-global` | `packages/react/ds-global` | Global tier components: Button, Badge, Card, Chip, Icon, Link, Rule, Section, SkipLink, Tooltip |
| `@canonical/react-ds-global-form` | `packages/react/ds-global-form` | Form components with react-hook-form integration. Guides: [custom fields](packages/react/ds-global-form/docs/creating-custom-fields.md), [middleware](packages/react/ds-global-form/docs/creating-middleware.md) |
| `@canonical/react-ds-app` | `packages/react/ds-app` | Application tier components: Navigation, Toolbar |
| `@canonical/react-ds-app-launchpad` | `packages/react/ds-app-launchpad` | Launchpad-specific: Markdown renderer, Tooltip variants |
| `@canonical/react-ssr` | `packages/react/ssr` | Server-side rendering utilities |

### Styles

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/styles` | `packages/styles/main/canonical` | Aggregator importing all style layers |
| `@canonical/styles-primitives-canonical` | `packages/styles/primitives/canonical` | Design tokens as CSS custom properties |
| `@canonical/styles-elements` | `packages/styles/elements` | Base HTML element styling (extends normalize.css) |
| `@canonical/styles-modes-canonical` | `packages/styles/modes/canonical` | Canonical colour theme |
| `@canonical/styles-modes-density` | `packages/styles/modes/density` | Density variants (compact, comfortable) |
| `@canonical/styles-modes-intents` | `packages/styles/modes/intents` | Intent modifiers (positive, negative, caution) |
| `@canonical/styles-modes-motion` | `packages/styles/modes/motion` | Motion and animation preferences |
| `@canonical/styles-debug` | `packages/styles/debug` | Development aids including baseline grid overlay |

### Core Infrastructure

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/ds-types` | `packages/ds-types` | TypeScript types for modifier families and component props |
| `@canonical/ds-assets` | `packages/ds-assets` | Icons and shared visual assets |
| `@canonical/utils` | `packages/utils` | Utility functions: debounce, throttle |
| `@canonical/typography` | `packages/typography` | Font utilities and extracted font data |

### Developer Tooling

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/webarchitect` | `packages/webarchitect` | Architecture validation CLI with JSON Schema rulesets |
| `@canonical/generator-ds` | `packages/generator-ds` | Yeoman generator for scaffolding components |
| `@canonical/storybook-addon-msw` | `packages/storybook/addon-msw` | Mock Service Worker integration for Storybook |
| `@canonical/storybook-addon-baseline-grid` | `packages/storybook/addon-baseline-grid` | Baseline grid overlay for typography verification |

### Configuration

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/biome-config` | `configs/biome-config` | Shared Biome configuration for linting and formatting |
| `@canonical/typescript-config-base` | `configs/typescript-config-base` | Base TypeScript configuration |
| `@canonical/typescript-config-react` | `configs/typescript-config-react` | TypeScript configuration extending base with React settings |
| `@canonical/storybook-config` | `configs/storybook-config` | Shared Storybook configuration factory |

## Acknowledgements

Thanks to [Chromatic](https://www.chromatic.com/) for providing the visual testing platform that helps us review UI changes and catch visual regressions.
