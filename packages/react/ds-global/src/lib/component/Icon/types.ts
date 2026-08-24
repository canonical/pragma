import type { IconName } from "@canonical/ds-assets";
import type { SVGAttributes } from "react";

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface IconProps extends SVGAttributes<HTMLOrSVGElement> {
  /**
   * Name of the icon to display. Autocompletes `@canonical/ds-assets`'
   * built-in icons, but accepts any string — pass a custom icon name
   * alongside a matching entry in {@link IconProps.manifest} (or a plain
   * `<name>.svg` under `rootPath`, see there) to render icons that aren't
   * part of `ds-assets`.
   * Icons are decorative by default (`aria-hidden="true"`). Pass an
   * `aria-label` (or `aria-labelledby`) when the icon conveys meaning on
   * its own; it is then exposed as a named `img` element.
   */
  icon: IconName | (string & {});
  /**
   * Root path to the icons (default: /icons). Must be exposed to the user —
   * self-host `@canonical/ds-assets`' `dist/icons/` directory there verbatim
   * so its filenames match {@link IconProps.manifest}. See
   * `@canonical/ds-assets`'s docs/ICONS.md for cache-invalidation guidance.
   */
  rootPath?: string;
  /**
   * Maps an icon name to its filename under `rootPath`. Defaults to
   * `@canonical/ds-assets`'s `ICON_MANIFEST`, which points each built-in
   * icon at a content-hashed filename so updating one icon only invalidates
   * that icon's cached URL, not the whole set.
   *
   * Use this to add custom icons alongside `ds-assets`' own: merge your own
   * entries in (`{ ...ICON_MANIFEST, "my-icon": "my-icon.<hash>.svg" }`) and
   * self-host the matching files under `rootPath`. An icon missing from the
   * override falls back to `ICON_MANIFEST`; an icon missing from both falls
   * back to the plain `<icon>.svg` naming — functional, but not cache-safe,
   * so a custom icon you care about invalidating correctly needs its own
   * manifest entry — hash it with `buildAssetManifest` from
   * `@canonical/ds-assets/build` to match `ICON_MANIFEST`'s own scheme.
   */
  manifest?: Record<string, string>;
}
