# Canonical Storybook Configuration

This package provides a reusable configuration factory for Canonical's Storybook projects.

This package, at the moment, solely exports the shared config. We might in the future, leverage the factory pattern to provide more customization.

## Getting Started
1. In your React, Svelte or Web Components Storybook project, install this package with `bun add -d @canonical/storybook-config`
2. Replace the contents of `.storybook/main.ts` by 

```typescript 
import { createConfig } from "@canonical/storybook-config";

export default createConfig("react"); // or one of "svelte", "sveltekit", "lit"
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



## Theming: two documents, not one

Storybook renders into **two separate documents**, and this is the single fact
that most theming confusion here reduces to.

- The **manager** — sidebar and toolbar — is themed by
  `addons.setConfig({ theme })`, which `@canonical/storybook-addon-shell-theme`
  does from its manager entry point.
- **Documentation pages** render inside the **preview iframe**. The manager
  theme never reaches them. Given no theme of their own, Storybook falls back to
  its built-in light theme, so every docs page renders as unbranded Storybook
  grey no matter what the frame around it looks like. That was
  [#962](https://github.com/canonical/pragma/issues/962).

This package closes that gap: `previewConfig` sets `parameters.docs.container`
to `src/DocsContainer.tsx`, which passes the Canonical theme into the docs page
and follows the reader's OS light/dark preference.

Story **content** theming is not part of this — that belongs to
`@canonical/storybook-addon-utils`, which owns the scheme toolbar and the
`.light` / `.dark` classes.

### Why a container rather than `parameters.docs.theme`

`docs.theme` is a plain parameter, read once at render. The page would be
correct on load but would not follow a live OS change — it would need a reload
while the manager around it flipped instantly. A container can subscribe to
`prefers-color-scheme`.

### Why the container lives here and not in the shell-theme addon

It looks like it belongs in the addon, and moving it is the obvious future
refactor. **It breaks.** That addon's Vite build externalises `storybook/*` but
nothing else, so bundling React and `@storybook/addon-docs` into it ships a
second React — and the container calls a hook, so the duplicate copy raises an
invalid hook call. This package already carries `@storybook/addon-docs`, React
types and a React TypeScript config, so the component belongs here.

Note the failure mode precisely, because the obvious guess is wrong: it is *not*
a lost docs context. `@storybook/addon-docs` parks its context on
`globalThis.__DOCS_CONTEXT__`, first loader winning, specifically so duplicate
bundles share one instance. React is the singleton that does not survive being
duplicated.

React is safe for the Svelte and Lit Storybooks: `@storybook/addon-docs`
declares React as a hard dependency, and the container renders through the docs
renderer rather than as a story decorator.

## Caveats 
- At the moment the factory is not configurable. We are not sure what the best api to pass custom config parameters would be, if any.
- This storybook config for the time being only implementing a factory for react/vite, svelte/vite and lit/vite. We imagine this might change to accomodate other frameworks and build tools.
