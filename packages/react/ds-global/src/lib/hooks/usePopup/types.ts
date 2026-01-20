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
} from "../useWindowFitment/index.js";

export interface UsePopupProps
  extends UseWindowFitmentProps,
    UseDelayedToggleProps {
  /** A callback to be called when the target element is focused. */
  onFocus?: FocusEventHandler;
  /** A callback to be called when the target element loses focus. */
  onBlur?: FocusEventHandler;
  /** A callback to be called when the mouse enters the target element. */
  onEnter?: PointerEventHandler;
  /** A callback to be called when the mouse leaves the target */
  onLeave?: PointerEventHandler;
  /** A callback to be called when the popup is shown. */
  onShow?: (event?: Event) => void;
  /** A callback to be called when the popup is hidden. */
  onHide?: (event?: Event) => void;
  /** Whether the popup should close when the escape key is pressed. Defaults to true. */
  closeOnEscape?: boolean;
}

export type DisableableElement = HTMLElement & {
  disabled: boolean;
};

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
  popupPositionStyle: CSSProperties;
  /**
   * A unique ID for the popup element. This can be used to associate a trigger with a popup, using `aria-describedby`.
   */
  popupId: string;
  /**
   * Whether the popup is currently open.
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
