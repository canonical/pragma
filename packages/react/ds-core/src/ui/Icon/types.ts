/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { IconName } from "@canonical/ds-assets";
import type { ImgHTMLAttributes } from "react";
import type { ICON_SIZES } from "./constants.js";

export type IconSize = (typeof ICON_SIZES)[number];

export interface IconProps extends ImgHTMLAttributes<HTMLImageElement> {
  /* Name of the icon to display */
  icon: IconName;
  /* Size of the icon */
  size?: IconSize;
  /* Root path to the icons (default: /assets/icons) */
  rootPath?: string;
}
