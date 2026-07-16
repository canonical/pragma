# Canonical Storybook Configuration

This package provides a reusable configuration factory for Canonical's Storybook projects.

This package, at the moment, solely exports the shared config. We might in the future, leverage the factory pattern to provide more customization.

## Getting Started
1. In your React, Svelte or Web Components Storybook project, install this package with `bun add -d @canonical/storybook-config`
2. Replace the contents of `.storybook/main.ts` by 

```typescript 
import { createConfig } from "@canonical/storybook-config";

export default createConfig("react"); // or one of "svelte", "lit"
```

## Notes

The [autodocs](https://storybook.js.org/docs/writing-docs/autodocs) feature is enabled project-wide by setting `tags: ["autodocs"]` at preview level, so story files do not need to declare the tag themselves (a story can still opt out with `tags: ["!autodocs"]`).

This package exports the shared preview configuration (`@canonical/storybook-config/preview`), which includes that default. However, Storybook statically parses each project's own `.storybook/preview.ts` and does not reliably pick up `tags` (or `storySort`) spread from an imported preview ([storybookjs/storybook#31842](https://github.com/storybookjs/storybook/issues/31842)). Consuming projects must therefore declare `tags: ["autodocs"]` inline in their own `.storybook/preview.ts`:

```typescript
import previewConfig from "@canonical/storybook-config/preview";

const preview = {
  ...previewConfig,
  tags: ["autodocs"],
};

export default preview;
```



## Caveats 
- At the moment the factory is not configurable. We are not sure what the best api to pass custom config parameters would be, if any.
- This storybook config for the time being only implementing a factory for react/vite, svelte/vite and lit/vite. We imagine this might change to accomodate other frameworks and build tools.
