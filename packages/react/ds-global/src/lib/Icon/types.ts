import type { IconName } from "@canonical/ds-assets";
import type { SVGAttributes } from "react";

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface IconProps extends SVGAttributes<HTMLOrSVGElement> {
  /* Name of the icon to display */
  icon: IconName;
  /** Root path to the icons (default: /icons). Must be exposed to the user. */
  rootPath?: string;
}
