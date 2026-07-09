import type { CSSProperties, ReactNode } from "react";
import type { UseDisclosureProps } from "../../../../hooks/index.js";

export interface TooltipAreaProps extends Omit<UseDisclosureProps, "mode"> {
  /**
   * The target element to which the tooltip should be attached.
   * This can be any valid React element.
   */
  children: ReactNode;
  /**
   * The content of the tooltip. This can be a string or any valid React node.
   */
  Message: ReactNode;
  /**
   * An optional leading icon for the tooltip, rendered before the message
   * (Figma: 16px glyph, dimension-100 gap). Purely decorative.
   */
  icon?: ReactNode;
  /**
   * Force the tooltip open (or closed), overriding hover/focus. When a boolean
   * is passed the tooltip is fully controlled and ignores pointer/keyboard —
   * useful for stories, visual tests, or driving the tooltip from outside.
   * Leave undefined for the default hover behaviour.
   */
  open?: boolean;
  /** Styles applied to the tooltip area */
  style?: CSSProperties;
  /** Class name applied to the tooltip area */
  className?: string;
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
