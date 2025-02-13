## Canonical Design System - React Core - Contribution Documentation

This package provides an overview of the contribution process for the React Core package of Canonical's Design System.

## Getting Started
Follow the [repository setup](../../../README.md) guide to set up your development environment.

Once the repository is set up, navigate to the `react/ds-core` package directory and run `bun run storybook` to start the Storybook server.

Open the Storybook server at [http://localhost:6006](http://localhost:6006) to view the components and their documentation.

Storybook will automatically reload when you make changes to the components, using Vite HMR.

### Generating a component
The [react component generator](../../generator-ds/src/component/README.md) provides a CLI to generate new components.
To create a new component, [install Yeoman](../../generator-ds/README.md), then navigate to the component root directory `src/ui`. 
Run `yo @canonical/ds:component MyNewComponent` to generate a new component.
You can also run `yo @canonical/ds:component --help` to see more available options, such as generating a component with a story and/or CSS file included.

### Checking / Formatting / Testing
Before committing your changes, run `bun run check:fix` to check and format your code, and automatically apply any fixable formatting changes.
You will be alerted of any unfixable issues, which you will need to resolve manually.

To test your changes, run `bun run test` to run the Vitest test suite. This will run Vitest once.
It may also be helpful to run `bun run test:watch` to run Vitest in watch mode, which will re-run the tests when you make changes to the code.
