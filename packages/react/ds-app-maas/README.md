## Canonical Design System - React Core

This package provides the core React components and utilities for Canonical's Design System.

## Getting Started

Install the package in a React 19 project with `bun add @canonical/react-ds-core`.

Then, import components from the package and use them in your React components. 
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