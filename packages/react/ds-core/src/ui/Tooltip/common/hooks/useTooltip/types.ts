import type {
  CSSProperties,
  FocusEventHandler,
  PointerEventHandler,
  RefObject,
} from "react";
import type { UseDelayedOpenProps } from "../../../../hooks/useDelayedOpen/index.js";
import type { UseFittedPopupProps } from "../../../../hooks/useFittedPopup/index.js";

export interface UseTooltipProps
  extends UseFittedPopupProps,
    UseDelayedOpenProps {
  /**
   * Whether the tooltip is currently open.
   * If provided, this prop will override the internal openness state.
   */
  isOpenOverride?: boolean;
  /**
   * Delay in milliseconds before showing the tooltip.
   * Defaults to 350ms.
   */
  showDelay?: number;
  /**
   * Delay in milliseconds before hiding the tooltip.
   * Defaults to 350ms.
   */
  hideDelay?: number;
}

export interface UseTooltipResult<
  TTriggerElement extends HTMLElement = HTMLElement,
> {
  /**
   * A ref to be attached to the target element.
   */
  targetRef: RefObject<HTMLDivElement | null>;
  /**
   * A ref to be attached to the tooltip message element.
   */
  messageRef: RefObject<HTMLDivElement | null>;
  /**
   * The style object to be applied to the tooltip message element.
   */
  messageStyle: CSSProperties;
  /**
   * A unique ID for the tooltip message element.
   */
  messageId: string;
  /**
   * Whether the tooltip is currently visible.
   */
  isOpen: boolean;
  /**
   * Whether the target element is currently focused.
   */
  isFocused: boolean;
  /**
   * Event handler for when the target element is focused.
   */
  handleTriggerFocus: FocusEventHandler<TTriggerElement>;
  /**
   * Event handler for when the target element loses focus.
   */
  handleTriggerBlur: FocusEventHandler<TTriggerElement>;
  /**
   * Event handler for when the mouse enters the target element.
   */
  handleTriggerEnter: PointerEventHandler<TTriggerElement>;
  /**
   * Event handler for when the mouse leaves the target element.
   */
  handleTriggerLeave: PointerEventHandler<TTriggerElement>;
}
