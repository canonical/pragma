import type { CSSProperties, ReactNode } from "react";
import type { UsePopupProps } from "../../../hooks/index.js";

export interface TooltipAreaProps extends UsePopupProps {
  /**
   * The element to which the tooltip should be attached.
   * This can be any valid React element.
   * Defaults to `document.body`.
   */
  portalElement?: HTMLElement;
  /**
   * The target element to which the tooltip should be attached.
   * This can be any valid React element.
   */
  children: ReactNode;
  /**
   * The content of the tooltip. This can be a string or any valid React node.
   */
  Message: ReactNode;

  /** ID applied to the target element */
  targetElementId?: string;
  /** Class name applied to the target element */
  targetElementClassName?: string;
  /** Style object applied to the target element */
  targetElementStyle?: CSSProperties;

  /* Class name applied to the tooltip/message element */
  messageElementClassName?: string;

  /* Styles applied to the tooltip/message element */
  messageElementStyle?: CSSProperties;
}
