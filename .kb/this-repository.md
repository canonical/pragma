# Preface

What is specific to `canonical/pragma-web`: where its conventions are documented, and which topic files hold the rules that apply only here. Read this after the root `AGENTS.md`, before changing anything in this repository.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

`canonical/pragma-web` holds the design-system packages that render: the React, Svelte and Lit component libraries, the stylesheets, the Storybook packages and configurations, the runtime packages (router, internationalisation, server-side rendering), the applications under `apps/`, and the documentation site (`packages/prism/*` and `apps/react/pragma-docs`). The toolchain it builds with comes from `canonical/pragma-core` through npm.

Most conventions here are documented. Setup and the monorepo mechanics are in [`old/CONTRIBUTING.md`](../old/CONTRIBUTING.md); the architecture, the domains and the component folder structure are explained under [`docs/explanations/`](../docs/explanations/ARCHITECTURE.md), and the CI pipeline in [`docs/CI.md`](../docs/CI.md).

# Important

- Before writing or changing a React component's props type, read `.kb/react-props.md`: props extend the native props of the root element.
- Before adding a dependency to a runtime or component package, read `.kb/documentation-site.md`: the documentation site depends on the runtime, never the reverse.
- Before opening a pull request, read `.kb/chromatic.md`: Chromatic reviews visual changes, and a pull request with no visual change carries the `Chromatic: skip` label.
- Before adding a new package, read `.kb/publishing.md`: its first publish and its trusted-publisher setup are manual steps a human takes.
