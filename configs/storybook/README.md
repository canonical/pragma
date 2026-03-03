# Canonical Storybook Configuration

This package provides a reusable configuration factory for Canonical's Storybook projects.

This package, at the moment, solely exports the shared config. We might in the future, leverage the factory pattern to provide more customization.

## Getting Started
1. In your React, Svelte or Web Components Storybook project, install this package with `bun add -d @canonical/storybook-config`
2. Replace the contents of `.storybook/main.ts` by 

```typescript 
import { createConfig } from "@canonical/storybook-config";

export default createConfig("react"); // or one of "svelte", "webcomponents"
```

## Notes

The [autodocs](https://storybook.js.org/docs/writing-docs/autodocs) feature is enabled by this config with ```typescript
{
    docs: {
       autodocs: true,
    },
}
```



## Caveats 
- At the moment the factory is not configurable. We are not sure what the best api to pass custom config parameters would be, if any.
- This storybook config for the time being only implementing a factory for react/vite, svelte/vite and webcomponents/vite. We imagine this might change to accomodate other frameworks and build tools.
