import type {
  CSSProperties,
  FocusEventHandler,
  PointerEventHandler,
  RefObject,
} from "react";
import type { UseDelayedToggleProps } from "../useDelayedToggle/index.js";
import type {
  UseWindowFitmentProps,
  UseWindowFitmentResult,
  WindowFitmentStyles,
} from "../useWindowFitment/index.js";

export interface UsePopupProps
  extends UseWindowFitmentProps,
    UseDelayedToggleProps {
  /**
   * Whether the popup is currently open.
   * If provided, this prop will override the internal openness state.
   */
  isOpenOverride?: boolean;
}

export interface UsePopupResult extends UseWindowFitmentResult {
  /**
   * A ref to be attached to the target element.
   */
  targetRef: RefObject<HTMLDivElement | null>;
  /**
   * A ref to be attached to the popup element.
   */
  popupRef: RefObject<HTMLDivElement | null>;
  /**
   * The style object to be applied to the popup element.
   */
  popupPositionStyle: WindowFitmentStyles;
  /**
   * A unique ID for the popup element. This can be used to associate a trigger with a popup, using `aria-describedby`.
   */
  popupId: string;
  /**
   * Whether the popup is currently visible.
   */
  isOpen: boolean;
  /**
   * Whether the target element is currently focused.
   */
  isFocused: boolean;
  /**
   * Event handler for when the target element is focused.
   */
  handleTriggerFocus: FocusEventHandler;
  /**
   * Event handler for when the target element loses focus.
   */
  handleTriggerBlur: FocusEventHandler;
  /**
   * Event handler for when the mouse enters the target element.
   */
  handleTriggerEnter: PointerEventHandler;
  /**
   * Event handler for when the mouse leaves the target element.
   */
  handleTriggerLeave: PointerEventHandler;
}
