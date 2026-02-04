# @canonical/react-ds-app-anbox

Anbox-specific components for the Pragma design system. This package provides specialized UI elements for the Anbox application tier.

## Prerequisites

- React 19 or higher

## Installation

```bash
bun add @canonical/react-ds-app-anbox
```

The package builds on top of `@canonical/react-ds-global`.

## Usage

```tsx
import { Button } from "@canonical/react-ds-app-anbox";

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
cd packages/react/ds-app-anbox
bun run storybook
```

## Component Specifications

Component specifications are defined in the [Design System Ontology](https://github.com/canonical/design-system).
