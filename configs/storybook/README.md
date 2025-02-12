# Canonical Storybook Configuration

This package provides a reusable configuration factory for Canonical's Storybook projects.

This package, at the moment, solely exports the shared config. We might in the future, leverage the factory pattern to provide more customization.

## Getting Started
1. In your React Storybook project, install this package with `bun add @canonical/storybook-config`
2. Replace the contents of `.storybook/main.ts` by 

```typescript 
import { createConfig } from "@canonical/storybook-config";

const config = createConfig();

/* Otherwise leads to a TS error "CSF Parsing error: Expected 'ObjectExpression' but found 'CallExpression' instead in 'CallExpression'."
 * https://github.com/storybookjs/storybook/issues/26778#issuecomment-2584041985
 */
export default { ...config };
```

## Caveats 
- At the moment the factory is not configurable. We are not sure what the best api to pass custom config parameters would be, if any.
- This storybook config for the time being only implementing a factory for react/vite. We imagine this might change to accomodate other frameworks and build tools.
