# @canonical/react-ds-app

Application-level UI components for the Pragma design system. This package provides navigation, toolbars, and layout components suited for internal tools and applications.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-app
```

The package builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { Button } from "@canonical/react-ds-app";

function AppHeader() {
  return (
    <header>
      <Button>Settings</Button>
    </header>
  );
}
```

## Storybook

```bash
cd packages/react/ds-app
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
