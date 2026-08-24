import type { IconName } from "@canonical/ds-assets";
import type { SVGAttributes } from "react";

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface IconProps extends SVGAttributes<HTMLOrSVGElement> {
  /**
   * Name of the icon to display.
   * Icons are decorative by default (`aria-hidden="true"`). Pass an
   * `aria-label` (or `aria-labelledby`) when the icon conveys meaning on
   * its own; it is then exposed as a named `img` element.
   */
  icon: IconName;
  /**
   * Root path to the icons (default: /icons). Must be exposed to the user —
   * self-host `@canonical/ds-assets`' `dist/icons/` directory there verbatim
   * so its filenames match {@link IconProps.manifest}. See
   * `@canonical/ds-assets`'s docs/ICONS.md for cache-invalidation guidance.
   */
  rootPath?: string;
  /**
   * Maps an icon name to its filename under `rootPath`. Defaults to
   * `@canonical/ds-assets`'s `ICON_MANIFEST`, which points each icon at a
   * content-hashed filename so updating one icon only invalidates that
   * icon's cached URL, not the whole set. Override to plug in a custom
   * self-hosting scheme, or a mocked manifest in tests; an icon missing from
   * the override falls back to `ICON_MANIFEST`.
   */
  manifest?: Partial<Record<IconName, string>>;
}
