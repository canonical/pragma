/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { IconName } from "@canonical/ds-assets";
import type { HTMLAttributes } from "react";
import type { ICON_SIZES } from "./constants.js";

export type IconSize = (typeof ICON_SIZES)[number];

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface IconProps extends HTMLAttributes<HTMLDivElement> {
  /* Name of the icon to display */
  iconName?: IconName;
  /* Size of the icon */
  size?: IconSize;
}
