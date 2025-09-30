/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ImgHTMLAttributes } from "react";
import type { SectionProps } from "../Section/index.js";

export interface ThumbnailSectionProps extends Omit<SectionProps, "children"> {
  /** Additional class name(s) to apply to the component */
  className?: string;

  /**
   * Props for the thumbnail image element
   * TODO this should always include `alt` for accessibility, and this is likely to be repeated across the DS - should this type + `alt` requirement be extracted to ds-types packages?
   */
  imageProps: ImgHTMLAttributes<HTMLImageElement>;
}
