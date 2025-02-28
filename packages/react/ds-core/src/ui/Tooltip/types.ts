import type { ReactNode } from "react";
import type { UseTooltipProps } from "./common/hooks/useTooltip/index.js";

export interface TooltipProps extends UseTooltipProps {
  /**
   * The target element to which the tooltip should be attached.
   * This can be any valid React element.
   */
  children: ReactNode;
  /**
   * The content of the tooltip. This can be a string or any valid React node.
   */
  message: ReactNode;
}
