import type { CSSProperties, ReactNode } from "react";
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
  /** ID applied to the target element */
  targetElementId?: string;
  /** Class name applied to the target element */
  targetElementClassName?: string;
  /** Style object applied to the target element */
  targetElementStyle?: CSSProperties;
  /** Class name applied to the tooltip/message element */
  messageElementClassName?: string;
  /** Styles applied to the tooltip/message element */
  messageElementStyle?: CSSProperties;
  /**
   * The element to which the tooltip should be attached.
   * This can be any valid React element.
   * When not provided, the tooltip will be attached to the `document.body`.
   * No default is provided at the TooltipArea signature level in order to prevent the component from failing builds in server environments, where `document` is not available.
   */
  parentElement?: HTMLElement;
}
