# Canonical React Typescript Configuration

This package provides a central configuration for Canonical's React Typescript projects.

This configuration extends a [base configuration](https://www.npmjs.com/package/@canonical/typescript-config),
which provides more general TypeScript settings and is suitable for non-React projects.

## Getting Started
1. Install Typescript: `bun add -d typescript`
2. Install this configuration: `bun add -d @canonical/typescript-config-react`
3. Create a `tsconfig.json` file in the root of your project and extend this configuration.

```json
{
  "extends": "@canonical/typescript-config-react"
}
```

## Configuration

This configuration enables the following behavior:
1. [`DOM` library](https://www.typescriptlang.org/tsconfig/#lib) inclusion: Includes the `DOM` library, providing types for the DOM and browser APIs.
2. [`react-jsx` transform](https://www.typescriptlang.org/tsconfig/#jsx): Emits `.jsx` as `.js` with the [new React JSX transform](https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html), optimized for production usage.

### History

This configuration is rooted in the [Canonical React Components Typescript config](https://github.com/canonical/react-components/blob/30cc5e338f1fbca75625a94993bccd6cf902fc28/tsconfig.json).
It has been generalized to support non-React projects and be more minimal.

React-specific changes to the original config are listed below. 
For non-React relevant changes, see the [base configuration README](https://www.npmjs.com/package/@canonical/typescript-config#history).

- **`"jsx": "react"`** → `"jsx": "react-jsx"`: Transforms JSX to JS with [modern React JSX optimizations](https://legacy.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html), instead of with React.createElement. Enables usage of JSX without importing React.
