# @canonical/react-ds-app-portal

Portal-specific components for the Pragma design system. This package provides specialized UI elements for the Portal application tier.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-app-portal
```

The package builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { Button } from "@canonical/react-ds-app-portal";

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
cd packages/react/ds-app-portal
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
