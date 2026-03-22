# @canonical/storybook-addon-shell-theme

A Storybook addon that applies the distinct Canonical branding to your Storybook instance. This addon handles the UI appearance (Manager area), injects official fonts, sets up the favicon, and manages Light/Dark mode based on system preferences.

## Features

- **Canonical Branding:** Applies the Ubuntu color palette (Orange `#E95420`, dark grays) to the Storybook UI.

- **Typography:** Automatically loads **Ubuntu** and **Ubuntu Mono** variable fonts from the official Canonical assets server.

- **System Preference Support:** Automatically switches between **Light** and **Dark** themes based on the user's OS settings (`prefers-color-scheme`).

- **Favicon:** Injects the Canonical "Circle of Friends" (CoF) logo as the browser tab icon.

- **Zero-Config Defaults:** Works immediately upon installation, with optional customization for project identity.

## Installation

Install the addon using your package manager:

```shell
bun add -D @canonical/storybook-config @canonical/storybook-addon-shell-theme
```

## Usage

Register the addon in your `.storybook/main.ts` file:

TypeScript

```typescript
// .storybook/main.ts
import { createConfig } from "@canonical/storybook-config";

const config = createConfig("react"); // or "svelte"

export default config;
```

## Design tokens

Theme colors are defined in `src/theme/tokens.ts` and sourced from
[`@canonical/design-tokens`](https://github.com/canonical/design-tokens).

**All values must be hex.** Storybook's UI uses
[polished.js](https://polished.js.org/) (`opacify`, `darken`, `lighten`,
`transparentize`) pervasively in styled-components throughout the manager —
not just in the theme conversion layer but in buttons, tooltips, tabs, etc.
polished.js only supports hex, rgb, rgba, hsl, and hsla. CSS `var()` and
`oklch()` will crash at runtime.

Each token is annotated with its CSS custom property name from
`@canonical/design-tokens` for traceability.

## Customization

The addon allows you to customize the Project Name and Logo displayed in the Storybook sidebar via environment variables.

You can set these in your `.storybook/main.ts` using the `env` configuration property to ensure they are available to the browser-side manager.

TypeScript

```typescript
// .storybook/main.ts
import { createConfig } from "@canonical/storybook-config";

const config = createConfig("react", { // or "svelte"
  projectName: "My Project Name",
  projectLogo: "https://example.com/my-logo.svg",
});

export default config;
```
