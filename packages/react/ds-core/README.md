## Canonical Design System - React Core

This package provides the core React components and utilities for Canonical's Design System.

## Getting Started

Install the package in a React 19 project with `bun add @canonical/react-ds-core`.

Then, import components from the package and use them in your React components. Each component automatically imports its own CSS styles.

An example of a component using the `Button` component:
```tsx
// MyComponent.tsx
import { Button } from "@canonical/react-ds-core";

function MyComponent() {
  return (
    <div>
      <Button
        appearance={"positive"}
        label={"Click me"}
        onClick={() => alert("hello world!")}
      />
    </div>
  );
}

export default MyComponent;
```

## LIGHTNINGCSS

Note: this branch is a work-in-progress state, following [this thread](https://github.com/canonical/pragma/pull/322#discussion_r2338494337).
Please check that thread to understand the state of this branch.