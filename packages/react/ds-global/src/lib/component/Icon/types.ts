import type { IconName } from "@canonical/ds-assets";
import type { ComponentProps } from "react";

type OwnProps = {
  /**
   * Name of the icon to display.
   * Icons are decorative by default (`aria-hidden="true"`). Pass an
   * `aria-label` (or `aria-labelledby`) when the icon conveys meaning on
   * its own; it is then exposed as a named `img` element.
   */
  icon: IconName;
  /** Root path to the icons (default: /icons). Must be exposed to the user. */
  rootPath?: string;
};

/** Props for the Icon component, extending the native props of its `<svg>` root. */
export type IconProps = OwnProps & Omit<ComponentProps<"svg">, keyof OwnProps>;
