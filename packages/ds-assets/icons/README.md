# Canonical DS Icons

This directory contains all of the icons used by our Design System.

## Icon requirements
In order to establish a baseline level of consistency across our icon set, we have defined a set of requirements
for all core icons.

Each icon shall:

1. Be stored as a single SVG file this directory
2. Be named using the format `<name>.svg`
3. Contain a single `<g>` element with the id `<name>`.
4. Use the same 16x16 viewbox size
5. All paths shall be filled with `currentColor` - with an exception for branded icons.

Icons adapt their color and size to their context. We use a consistent 16x16 viewbox across all icons, ensuring that when you need to adjust size, the scaling remains predictable regardless of the icon you're using.

Each icon's contents are wrapped in a `<g>` element with a matching ID (e.g., `<g id="warning">` for warning.svg). This pattern enables efficient reuse through SVG's `<use>` element - you can reference these icons in your markup like `<use href="path/to/warning.svg#warning" />`. Since the behavior of each icon is defined by these standards rather than implementation-specific code, platform libraries can stay lightweight. They just need to handle the mechanics of loading and displaying SVGs, keeping their APIs flat and predictable regardless of which icon you're using.

The [`scripts/standardize-icons.ts` script](../scripts/standardize-icons.ts) script will standardize all icons (
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

Non-branded icons are not associated with a particular brand. 
Some of these non-branded icons have, historically, had different color(s) than the current text color.

#### Status icons

Status icons frequently use color to convey meaning (e.g.,  red for error, green for success, yellow for warning).
In the interest of simplicity and uniformity (all non-branded icons should consume `currentColor`), these icons 
have been updated to consume only `currentColor`.
They are listed along with the color they would be bound to in case we need to revert them to use non-text color in the future.

| Icon Name(s)                             | Color variable                                                                      |
|------------------------------------------|-------------------------------------------------------------------------------------|
| `conflict`                               | `var(--tmp-color-caution)`                                                          |
| `conflict-resolution`                    | `var(--tmp-color-caution)`                                                          |
| `email`                                  | Multiple; see [multichromatic non-branded icons](#multichromatic-non-branded-icons) |
| `error`                                  | `var(--color-background-negative-default)`                                          |
| `status-in-progress`                     | Multiple; see [multichromatic non-branded icons](#multichromatic-non-branded-icons) |
| `status-failed-small`                    | `var(--color-background-negative-default)`                                          |
| `status-succeeded-small`                 | `var(--color-background-positive-default)`                                          |
| `status-waiting`, `status-waiting-small` | `var(--tmp-color-caution)`                                                          |
| `success`                                | `var(--color-background-positive-default)`                                          |
| `unit-running`                           | `var(--color-background-positive-default)`                                          |
| `warning`                                | `var(--tmp-color-caution)`                                                          |

#### Multichromatic non-branded icons
Some non-branded icons have also been multichromatic in the past. 
These are, so far, icons with a rounded, filled background shape, and multiple colored paths drawn on top. 

These icons have been simplified to also be monochromatic, consuming `currentColor` for all paths.

In case these icons need to be updated in the future to use multiple non-text colors, 
they are listed below along with their constituent colors.

| Icon Name            | Color Variables Used                                                                                                                                                                                                                                                        |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `email`              | - `var(--tmp-color-text-muted)` (grey background circle)<br>- `currentColor` (envelope path, assumed to be set to `var(--tmp-color-background-default)` by the implementation library)                                                                                      |
| `status-in-progress` | - `var(--color-palette-blue)` (blue background circle)<br>- `var(--tmp-color-background-alt)` (smaller loading spinner slice)<br>- `currentColor` (largest loading spinner slice, assumed to be set to `var(--tmp-color-background-default)` by the implementation library) |

## Sizing

We aim to provide icons that all have consistent 16x16 viewboxes. However, some of our historic icons do not have 16x16
viewboxes. These icons are not currently in the repo, but will be added in the future once we have scaled them.

- `email`
- `facebook`
- `github`
- `github-dark`
- `instagram`
- `linkedin`
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