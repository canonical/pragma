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

