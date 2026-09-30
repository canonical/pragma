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

## Scope: this addon themes chrome, not content

Storybook paints two things, through two mechanisms that never meet.

- **Chrome** — the manager frame (sidebar, toolbar) and the documentation page
  furniture. Themed from JavaScript, by handing Storybook an object of literal
  colour values. **This addon owns that.**
- **Story content** — themed by CSS custom properties from the design tokens.
  **`@canonical/storybook-addon-utils` owns that**, including the scheme toolbar
  and the `.light` / `.dark` classes.

Do not theme content from here. If a story renders in the wrong scheme, the fix
belongs in the utils addon.

The two documents matter as much as the two mechanisms. `addons.setConfig({
theme })` reaches the **manager** only; documentation pages render inside the
preview iframe, a separate document, and must be themed by passing `THEME` to a
docs container. `@canonical/storybook-config` does that — see its README.

## Design tokens

Theme colors are defined in `src/theme/tokens.ts` and sourced from
[`@canonical/design-tokens`](https://github.com/canonical/design-tokens).

**All values must be hex.** Storybook's UI uses
[polished.js](https://polished.js.org/) (`opacify`, `darken`, `lighten`,
`transparentize`) pervasively in styled-components throughout the manager —
not just in the theme conversion layer but in buttons, tooltips, tabs, etc.
polished.js only supports hex, rgb, rgba, hsl, and hsla. CSS `var()` and
`oklch()` will crash at runtime.

This constraint is the reason the addon mirrors *resolved values* instead of
consuming the design tokens directly, and it is the root of the hazard below.

### The values are conversions, not copies

There are **no hex values anywhere in `@canonical/design-tokens`** — every
palette entry is an `oklch()` literal. Every hex in `tokens.ts` is a
colour-space conversion someone performed. There is no hex to "read off the
token".

This table was once wrong in **18 of its 30 values**. Twelve were the same
mistake repeated: the conversion was floor-truncated rather than rounded, so
each channel landed one low — `#e9531f` is the floor of `233.005, 83.989,
31.951`, where the correct Ubuntu orange is `#e95420`. The rest were
mis-mappings: two `light-dark()` pairs recorded as though mode-invariant, and
the dark background and container colours transposed, which painted the dark
sidebar `#050505` against a design system that says `#1d1d1d`.

None of it was drift. The values never matched any released version — they were
mis-transcribed once and never re-checked, because nothing checks them.

If you must convert by hand: OKLab → linear sRGB → gamma, and **round**. Every
value lands within 0.03 of an integer channel, so a correct conversion is never
ambiguous. Better: don't. Generating this table from the tokens at build time is
tracked as **PRA-141**, and removes hand conversion entirely.

Each token is annotated with its CSS custom property name and the palette entry
it resolves to, so a pair can be re-checked against the design tokens.

## Surfaces

The chrome mirrors the design system's surface scale by **value**. It cannot
join it by **mechanism**: surfaces work by DOM nesting — a `.surface` inside a
`.surface` picks up layer 2 through CSS custom properties — and the chrome is a
JavaScript object that cannot read custom properties at all.

Content is surface 1; chrome is surface 2:

| Theme variable | Region | Surface | Light | Dark |
| --- | --- | --- | --- | --- |
| `appContentBg`, `appPreviewBg` | docs page, story canvas, addon panel | 1 — `--color-background` | `#ffffff` | `#1d1d1d` |
| `appBg`, `barBg` | sidebar, toolbar | 2 — `--color-background-layer2` | `#f8f8f8` | `#131313` |

Chrome sits *deeper* than the content it frames, which reads backwards until you
see why:

1. **The nesting claim would be false anyway.** The sidebar does not contain the
   content column — they are siblings in the DOM. Depth here is a borrowed
   palette, not a structural assertion, so it is free to follow semantics.
2. **The design system already puts navigation at layer 2.**
   `--color-foreground-navigation-primary` resolves to exactly the layer-2 pair,
   and `appHoverBg` is that token's `-hover` variant. Anchoring the sidebar on
   surface 1 instead mismatches the two scales: dark hover becomes `#1f1f1f` on
   `#1d1d1d`, a 2-in-255 delta — invisible. This was a real bug, not a
   hypothetical.
3. **Storybook's own themes agree** — chrome recedes, the reading surface
   advances.

### Where surfaces stop

- **The scale gives two usable tones, not a gradient.** It is three deep and
  *non-monotonic*: layer 3 returns to layer 1's values. Sidebar and toolbar
  therefore share a tone and are separated by `appBorderColor`, rather than by
  inventing a third surface.
- **Several regions have no surface concept.** Buttons, toggle tracks, inputs
  and states come from foreground tokens instead.
- **Hover and active must stay baked.** The design system derives them at
  runtime with `oklch(from … calc(l + var(--delta-…)))`, which Storybook cannot
  evaluate.
- **`--color-background-container` is not part of the scale**, despite reading
  like it should be. It is the static-container/media-placeholder colour and in
  dark mode is *darker* than surface 1. Do not reach for it.

See `SurfacesAndThemes.mdx` in `storybook-hub` for the surface model itself.

## History

Worth knowing, because the shape of this addon is a consequence of it.

The OS-following theme technique was copied from
[`canonical/svelte-icons`](https://github.com/canonical/svelte-icons/tree/main/.storybook)
in February 2026. That project themed **both** documents — the manager and, via
a custom docs container, the documentation page. Only the manager half came
across.

In July a workaround pinned documentation *content* to light, because the docs
chrome was stuck on Storybook's stock light theme and OS-driven dark content
inside it looked broken. It treated the symptom; the cause was the missing half.

Issue [#962](https://github.com/canonical/pragma/issues/962) was filed in August
against that same missing half. It was closed by adding the docs container to
`@canonical/storybook-config` and retiring the workaround.

The lesson worth carrying: **a change to chrome theming is not finished until
both documents are covered.** Verify a documentation page, not just the frame.

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
