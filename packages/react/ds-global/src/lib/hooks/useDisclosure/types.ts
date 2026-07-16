import type {
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  PointerEventHandler,
  RefObject,
} from "react";
import type { UseDelayedToggleProps } from "../useDelayedToggle/index.js";
import type {
  UseWindowFitmentProps,
  UseWindowFitmentResult,
} from "../useWindowFitment/index.js";

/**
 * How the disclosure is triggered.
 * - `hover`: opens on pointer-enter / focus, closes on pointer-leave / blur,
 *   with a delay. Suits tooltips and other non-interactive overlays. There is
 *   no native HTML primitive for this; the hook owns the open state.
 * - `click`: toggles on click, closes on outside-click and Escape, and returns
 *   focus to the trigger on close. Suits popovers, menus, and dropdowns. This
 *   mode is complementary to a native `<details>`/`<summary>` (or a
 *   `<button aria-expanded>` + panel), which provides the no-JS baseline while
 *   the hook layers on positioning and dismissal after hydration.
 */
export type DisclosureMode = "hover" | "click";

export interface UseDisclosureProps
  extends UseWindowFitmentProps,
    UseDelayedToggleProps {
  /** How the disclosure opens and closes. Defaults to `hover`. */
  mode?: DisclosureMode;
  /** An override for the open state. When boolean, the hook is controlled. */
  isOpen?: boolean;
  /** Called when the popup is shown. */
  onShow?: (event?: Event) => void;
  /** Called when the popup is hidden. */
  onHide?: (event?: Event) => void;
  /**
   * Whether the popup closes when the Escape key is pressed. Defaults to true.
   */
  closeOnEscape?: boolean;
  /**
   * Whether a `click` disclosure closes when a pointer-down occurs outside the
   * trigger and content. Ignored in `hover` mode. Defaults to true.
   */
  closeOnOutsideClick?: boolean;
  /**
   * Whether a `click` disclosure returns focus to the trigger when it closes.
   * Ignored in `hover` mode. Defaults to true.
   */
  returnFocus?: boolean;
  /** Called when the pointer enters the trigger (`hover` mode). */
  onEnter?: PointerEventHandler;
  /** Called when the pointer leaves the trigger (`hover` mode). */
  onLeave?: PointerEventHandler;
  /** Called when the trigger is focused. */
  onFocus?: FocusEventHandler;
  /** Called when the trigger loses focus. */
  onBlur?: FocusEventHandler;
}

/**
 * Props to spread onto the trigger element. The trigger is whatever the
 * component chooses to render (a `<button>`, a `<summary>`, a `<span>`); the
 * hook stays element-agnostic.
 */
export interface DisclosureToggleProps {
  /** Reflects the open state for assistive tech (`click` mode). */
  "aria-expanded"?: boolean;
  /** Points at the content element (`click` mode). */
  "aria-controls"?: string;
  /** Associates the trigger with its description (`hover` mode). */
  "aria-describedby"?: string;
  onClick?: (event: React.MouseEvent) => void;
  onKeyDown?: KeyboardEventHandler;
  onPointerEnter?: PointerEventHandler;
  onPointerLeave?: PointerEventHandler;
  onFocus?: FocusEventHandler;
  onBlur?: FocusEventHandler;
}

/** Props to spread onto the content (popup) element. */
export interface DisclosureContentProps {
  /** Stable id, matched by the trigger's `aria-controls` / `aria-describedby`. */
  id: string;
  /** Hidden from layout and assistive tech while closed. */
  hidden?: boolean;
  onPointerEnter?: PointerEventHandler;
  onPointerLeave?: PointerEventHandler;
}

export type DisableableElement = HTMLElement & {
  disabled: boolean;
};

/**
 * @typeParam TTarget - element type of the trigger element, forwarded to
 *   `useWindowFitment` so a non-`div` trigger (Popover's `<details>`) gets a
 *   correctly typed `targetRef` with no cast. Defaults to `HTMLElement`.
 */
export interface UseDisclosureResult<TTarget extends HTMLElement = HTMLElement>
  extends UseWindowFitmentResult<TTarget> {
  /** Whether the disclosure is currently open. */
  isOpen: boolean;
  /** Whether the trigger is currently focused. */
  isFocused: boolean;
  /** Imperatively open the disclosure. */
  open: () => void;
  /** Imperatively close the disclosure. */
  close: () => void;
  /** Imperatively toggle the disclosure. */
  toggle: () => void;
  /** A ref to attach to the trigger element. */
  targetRef: RefObject<TTarget | null>;
  /** A ref to attach to the content (popup) element. */
  popupRef: RefObject<HTMLDivElement | null>;
  /** The style object to apply to the content element. */
  popupPositionStyle: CSSProperties;
  /** A stable id for the content element (associates trigger and content). */
  popupId: string;
  /** Prop-getter for the trigger element. */
  getToggleProps: () => DisclosureToggleProps;
  /** Prop-getter for the content (popup) element. */
  getContentProps: () => DisclosureContentProps;
}
