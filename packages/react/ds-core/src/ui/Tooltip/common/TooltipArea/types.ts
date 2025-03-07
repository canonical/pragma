import type { ReactNode } from "react";
import type { UsePopupProps } from "../../../hooks/index.js";

export interface TooltipAreaProps extends UsePopupProps {
  /**
   * The target element to which the tooltip should be attached.
   * This can be any valid React element.
   */
  children: ReactNode;
  /**
   * The content of the tooltip. This can be a string or any valid React node.
   */
  Message: ReactNode;
}
