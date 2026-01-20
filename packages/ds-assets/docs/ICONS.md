# Icons

This document specifies the icon format and documents changes from Vanilla's icon set.

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

```typescript
import { ICON_NAMES, type IconName } from "@canonical/ds-assets";

interface Props {
  icon: IconName;
}
```

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
