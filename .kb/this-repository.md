# Preface

What is specific to `canonical/pragma-web`: where its conventions are documented, how to load the contributor skills, and which topic files hold the rules that apply only here. Read this after the root `AGENTS.md`, before changing anything in this repository.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

`canonical/pragma-web` holds the design-system packages that render: the React, Svelte and Lit component libraries, the stylesheets, the Storybook packages and configurations, the runtime packages (router, internationalisation, server-side rendering), the applications under `apps/`, and the documentation site (`packages/prism/*` and `apps/react/pragma-docs`). The toolchain it builds with comes from `canonical/pragma-core` through npm.

Most conventions here are documented. Setup and the monorepo mechanics are in [`old/CONTRIBUTING.md`](../old/CONTRIBUTING.md); the architecture, the domains and the component folder structure are explained under [`docs/explanations/`](../docs/explanations/ARCHITECTURE.md), and the CI pipeline in [`docs/CI.md`](../docs/CI.md).

# Important

- Start every change with the `start-change` skill. The contributor skills that `AGENTS.md` lists come from the `@canonical/skills-contribute` package, maintained in `canonical/pragma-core`; this repository carries no copy. Install them for your agent as the [package README](https://github.com/canonical/pragma-core/tree/main/packages/skills/contribute#install) describes, or read a skill directly from [its source](https://github.com/canonical/pragma-core/tree/main/packages/skills/contribute/skills), for example [`start-change`](https://github.com/canonical/pragma-core/blob/main/packages/skills/contribute/skills/start-change/SKILL.md).
- Before writing or changing a React component's props type, read `.kb/react-props.md`: props extend the native props of the root element.
- Before adding a dependency to a runtime or component package, read `.kb/documentation-site.md`: the documentation site depends on the runtime, never the reverse.
- Before adding a dependency on a pragma-core package, or moving the pins after a pragma-core release, read `.kb/core-packages.md`: exact pins, peer ranges, and how a re-pin is done.
- Before changing a TypeScript or Svelte packaging version, or a `tsconfig`, read `.kb/typescript.md`: the Svelte packages stay on TypeScript 6, and TypeScript 7 changes what consumers see.
- Before writing a hydration test in `packages/react/ds-global`, read [`packages/react/ds-global/.kb/testing.md`](../packages/react/ds-global/.kb/testing.md).
- Before opening a pull request, read `.kb/chromatic.md`: Chromatic reviews visual changes, and a pull request with no visual change carries the `Chromatic: skip` label.
- Before adding a new package, read `.kb/publishing.md`: its first publish and its trusted-publisher setup are manual steps a human takes.
