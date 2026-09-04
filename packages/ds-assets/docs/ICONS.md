# Icons

This document specifies the icon format and the search metadata that goes with it, and documents changes from Vanilla's icon set.

## Specification

Each icon must:

1. Be stored as a single SVG file in the `icons/` directory
2. Use the naming format `<name>.svg` (kebab-case)
3. Contain a single `<g>` element with `id="<name>"`
4. Use a 16x16 viewBox
5. Fill all paths with `currentColor` (branded icons excepted)

### ViewBox and Sizing

All icons use a consistent 16x16 viewBox. This ensures predictable scaling regardless of which icon you use. Display icons at their native size or scale proportionally.

### Group ID Pattern

Each icon wraps its contents in a `<g>` element with a matching ID:

```xml
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <g id="search">
    <path d="..." fill="currentColor"/>
  </g>
</svg>
```

This pattern enables efficient reuse through SVG's `<use>` element:

```html
<svg width="16" height="16">
  <use href="path/to/search.svg#search" />
</svg>
```

Platform libraries can stay lightweight because they only handle loading and displaying SVGs. The icon behaviour is defined by these standards rather than implementation-specific code.

### Colouring

Icons use `currentColor` for fill, inheriting the text colour of their parent element. To change an icon's colour, set the CSS `color` property on the icon or a parent element.

## TypeScript Support

The `src/icons/` folder exports:

- `ICON_NAMES` - Array of all icon names as a const
- `IconName` - Union type of all icon names
- `ICON_CATEGORIES` - Array of the categories an icon can belong to
- `IconCategory` - Union type of those categories
- `ICON_METADATA` - Metadata for every icon, keyed by icon name
- `IconMetadata` - The shape of a single metadata entry
- `IconDeprecation` - The shape of an entry's `deprecated` block

```typescript
import { ICON_NAMES, type IconName } from "@canonical/ds-assets";

interface Props {
  icon: IconName;
}
```

## Metadata

Icon names alone are a poor way to find an icon: someone looking for a way to throw something away searches for "trash", not "delete". `ICON_METADATA` carries the words people actually search for, so a search box can find an icon by meaning rather than by spelling.

```typescript
import { ICON_METADATA } from "@canonical/ds-assets";

ICON_METADATA.delete;
// {
//   tags: ["trash", "bin", "remove", "garbage", "erase", "dispose", "discard"],
//   categories: ["action"],
// }
```

Each entry has:

| Field | Required | Meaning |
| --- | --- | --- |
| `tags` | yes | Words someone might search for. At least three, lowercase, never the icon's own name. |
| `categories` | yes | One or more values from `ICON_CATEGORIES`, in that list's order. |
| `aliases` | no | Names the icon was previously published under. |
| `description` | no | One line explaining what the icon depicts or means. |
| `deprecated` | no | `{ replacedBy?, since? }`, present only while an icon is on its way out. |

### Categories

The list is closed, so filters stay predictable:

| Category | Holds |
| --- | --- |
| `navigation` | Arrows, chevrons, menus, and anything that moves you somewhere |
| `action` | Things you do: copy, delete, filter, search |
| `status` | State and severity: success, error, warning, priority, progress |
| `object` | Nouns from the interface: file, folder, user, tag |
| `social-brand` | Third-party logos |
| `product` | Canonical product concepts: machines, models, units, images |
| `theme` | Colour-scheme switching |

### Tags

A tag may be a single word or a phrase (`magnifying glass`, `side nav`); nothing tokenises them, so a search implementation decides for itself whether to split and stem. Tags are not normalised to a single spelling either — where British and American forms diverge, both are present (`colour scheme` and `color scheme`, `organise` and `organize`), because the point is to match whatever the person typed.

Tags describe the glyph and its meaning. Where a tag is the plain name of an unrelated icon it sends searches to the wrong place, so `pin` does not carry `location` and `debug` does not carry `search`. Within a family the overlap is deliberate and useful: `error-fill` carries `error`, and every `security-*` icon carries `security`.

Tags are free to overlap anything — another icon's name, another icon's alias, another icon's tags — because that is how a synonym finds more than one candidate. Only aliases are exclusive. The one thing a tag may not repeat is its own icon's alias, which would index the same word twice.

### Aliases

An alias is a name the icon used to answer to, most often a Vanilla name that changed when the set moved here. Searching for `unstarred` finds `starred-off`. Aliases are unique across the whole set and never collide with the name of a live icon. An icon never repeats its own alias as a tag; another icon may use it as a tag freely, which is how `help` still answers to `info`.

### Descriptions

Every `product` and `theme` icon carries a description, because its name assumes knowledge a reader may not have — `units` and `system-theme` mean nothing on their own. That half is enforced by the tests. Other icons carry one where it earns its place: the name does not say what the glyph depicts (`image` is an operating system image, not a picture; `fork` is a repository fork, not cutlery), or the icon arrived without a Vanilla counterpart to compare against.

### Adding an Icon

Add the SVG, add its name to `ICON_NAMES`, then add its metadata entry in the same position. The rules above are enforced by `src/icons/icons.test.ts` — run `bun run test` and it will name whatever is missing.

## Changes from Vanilla

Vanilla's icon set had inconsistent colouring. Some icons were monochromatic using `currentColor`, others used hardcoded colours. All icons have been updated to use `currentColor` exclusively.

### Branded Icons

Social media logos previously used hardcoded brand colours. They now use `currentColor`. The `-dark` variants for light backgrounds have been removed since icons now adapt to context automatically.

### Status Icons

Status icons previously used semantic colours (red for error, green for success). They now use `currentColor`, delegating colour responsibility to the consuming component or its CSS context.

Updated icons: `conflict`, `conflict-resolution`, `email`, `error`, `status-in-progress`, `status-waiting`, `success`, `unit-running`, `warning`

### Multichromatic Icons

Some non-branded icons had multiple colours (typically a filled background shape with paths on top). These have been simplified to monochromatic.

Updated icons: `email`, `status-in-progress`

## Accessibility

Icons that convey meaning should include appropriate ARIA attributes. Decorative icons should use `aria-hidden="true"` to hide them from screen readers.

```html
<!-- Meaningful icon -->
<svg role="img" aria-label="Search">
  <use href="search.svg#search" />
</svg>

<!-- Decorative icon -->
<svg aria-hidden="true">
  <use href="chevron-right.svg#chevron-right" />
</svg>
```
