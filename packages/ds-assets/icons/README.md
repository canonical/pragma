# Canonical DS Icons

This directory contains all of the icons used by our Design System.

## Icon requirements

Each icon shall:

1. Be stored as a single SVG file this directory
2. Be named using the format `<name>.svg`
3. Contain a single `<g>` element with the id `<name>`.
4. Use the same SVG canvas size. Currently, we are using 16x16.
5. All paths shall be filled with `currentColor`.

The [`src/icons/standardize-icons.ts` script](../src/icons/standardize-icons.ts) script will standardize all icons (
except ones with `-dark` versions, to be revisited later) in the [`/icons`](../icons) folder to follow these
requirements.
Run the script with `bun run standardize-icons`.

## Coloring

Most of our icons are monochromatic, and consume the current text color using `currentColor`. 
However, there are some icons that use more than one color. These icons are, as of September 2025:

### Brand icons

Brand icons represent a specific brand with a defined color scheme. These icons should retain their brand colors.

* `facebook`
* `github` (has discrete light/dark versions)
* `instagram`
* `linkedin`
* `rss`
* `x` (has discrete light/dark versions)
* `youtube`

### Non-branded icons

Non-branded icons are not associated with a particular brand and should be able to adapt to the surrounding text color,
in whole or in part.
In previous Canonical systems, these icons have had some or all of their colors baked into them, but can be adjusted to
use `currentColor` for their `fill` attributes (except for mask elements).

These icons have been updated to consume, in whole or in part, `currentColor` - but their implementation libraries will
need to bind their `color` styles to certain colors (in follow-ups):

| Icon Name(s)                             | Color variable                             |
|------------------------------------------|--------------------------------------------|
| `conflict`                               | `var(--tmp-color-caution)`                 |
| `conflict-resolution`                    | `var(--tmp-color-caution)`                 |
| `email`                                  | `var(--tmp-color-background-default)`      |
| `error`                                  | `var(--color-background-negative-default)` |
| `status-failed-small`                    | `var(--color-background-negative-default)` |
| `status-in-progress`                     | `var(--tmp-color-background-default)`      |
| `status-succeeded-small`                 | `var(--color-background-positive-default)` |
| `status-waiting`, `status-waiting-small` | `var(--tmp-color-caution)`                 |
| `success`                                | `var(--color-background-positive-default)` |
| `unit-running`                           | `var(--color-background-positive-default)` |
| `warning`                                | `var(--tmp-color-caution)`                 |

Some icons are non-branded and should stay multichromatic. These are, so far, icons with a rounded, filled background
shape, and multilpe colored paths drawn on top. In these cases, these icons have been set to directly consume color
tokens from `@canonical/styles-primitives-canonical`. These icons are:

| Icon Name            | Color Variables Used                                                                                                                                                                                                                                                        |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `email`              | - `var(--tmp-color-text-muted)` (grey background circle)<br>- `currentColor` (envelope path, assumed to be set to `var(--tmp-color-background-default)` by the implementation library)                                                                                      |
| `status-in-progress` | - `var(--color-palette-blue)` (blue background circle)<br>- `var(--tmp-color-background-alt)` (smaller loading spinner slice)<br>- `currentColor` (largest loading spinner slice, assumed to be set to `var(--tmp-color-background-default)` by the implementation library) |

## Sizing

We aim to provide icons that all have consistent 16x16 viewboxes. However, some of our historic icons do not have 16x16
viewboxes. These icons are stored with their unaltered viewboxes for now, but will be resized/scaled in a follow up:

- `email`
- `facebook`
- `github`
- `github-dark`
- `instagram`
- `rss`
- `x`
- `x-dark`
- `youtube`

## TypeScript Support

### Constants & Types

The [`src/icons` folder](../src/icons) contains the full list of icons as a TypeScript array (`ICON_NAMES`) and as a
type (`IconName`).

#### Usage example

```ts
import type {IconName} from "@canonical/ds-assets";

export interface MyComponentProps {
  iconName: IconName;
}
```

## SVG Optimization

TBD, in a follow-up we may update the icon standardization script to optimize SVGs using SVGO or a similar tool.