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

> **Self-hosting these SVGs?** See [Self-hosting and cache invalidation](#self-hosting-and-cache-invalidation) below — referencing `icons/` directly by name (as above) is fine for a one-off demo, but goes stale under normal caching once you're serving it from a real app.

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

## Self-hosting and cache invalidation

Icon filenames are stable across releases: `search.svg` never changes name even when its glyph does. If you self-host `icons/` (e.g. copy it into your app's `public/` directory) and serve it behind normal long-lived asset caching, a `ds-assets` update can ship a fixed or redesigned icon and browsers/CDNs will keep serving the old one indefinitely — the URL never changed, so nothing tells them to refetch. This is a consequence of how you're serving the files, not something `ds-assets` or an `Icon` component can fix on your behalf — asset delivery and cache configuration are your app's responsibility.

What `ds-assets` does provide is a way to make invalidation possible: `dist/icons/` ships each SVG under a **content-hashed filename** (`search.a1b2c3d4.svg`), alongside `ICON_MANIFEST`, which maps every icon name to its current hashed filename:

```typescript
import { ICON_MANIFEST } from "@canonical/ds-assets";

ICON_MANIFEST.search; // "search.a1b2c3d4.svg"
```

The hash changes only when that specific icon's contents change, so:

- Self-host `dist/icons/` (not `icons/`) verbatim, behind aggressive/`immutable` caching — every filename is already unique to its content, so there's nothing to go stale.
- Updating one icon changes only that icon's filename (and manifest entry) — every other icon's cached URL is untouched, unlike stamping a single version/build number across the whole set.
- `Icon` (`@canonical/react-ds-global`) reads `ICON_MANIFEST` by default, so `<Icon icon="search" />` resolves to the correct hashed filename automatically — no extra configuration needed as long as `rootPath` points at wherever you served `dist/icons/`.

If your build tooling already fingerprints static directories at the CDN/infra layer, this is redundant and you can self-host plain `icons/` instead — just be sure your infra's fingerprinting genuinely keys on file content, not just a directory-level version stamp, or you're back to the coarse-invalidation problem above.

### Custom icons

`Icon` (`@canonical/react-ds-global`) accepts icon names outside `ds-assets` — its `icon` prop takes any string, not just the built-in `IconName` union. A custom icon with no manifest entry still renders (falling back to plain `<icon>.svg` naming), but isn't cache-safe on its own.

To give a custom icon the same per-file cache invalidation as `ds-assets`' own icons, hash it the same way, using the underlying utility `ds-assets` itself is built on:

```typescript
import { buildAssetManifest } from "@canonical/ds-assets/build";

// In your build script:
const customManifest = buildAssetManifest({
  sourceDir: "./src/custom-icons",
  outDir: "./public/icons",
  manifestPath: "./src/custom-icons/manifest.generated.ts",
});
```

Then merge it into `ICON_MANIFEST` when passing `manifest` to `Icon`:

```tsx
import { ICON_MANIFEST } from "@canonical/ds-assets";
import customManifest from "./custom-icons/manifest.generated.js";

<Icon icon="my-custom-icon" manifest={{ ...ICON_MANIFEST, ...customManifest }} />
```

`buildAssetManifest` is Node-only (reads/writes the filesystem) — import it from your own build tooling, not from browser-rendered code.

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
