import type { CSSProperties, ReactNode, RefObject } from "react";

export interface UseDrawerProps {
  /** Controls whether the drawer is open (visible) or closed (hidden). */
  isOpenOverride: boolean;

  /** Callback function invoked when the drawer requests to be closed (e.g., user clicks overlay or close button). */
  onClose: (event?: Event) => void;

  /** Callback function invoked when the drawer requests to be opened. */
  onOpen?: (event?: Event) => void;

  /** Optional parent element to which the drawer will be appended. If not provided, defaults to document.body. */
  parent?: HTMLElement | null;

  /** Optional reference to the dialog element used for the drawer. This allows the user to pass in their own ref for the dialogue. */
  dialogueRef?: RefObject<HTMLDialogElement | null>;
}

export interface UseDrawerResult {
  /** Whether the drawer is currently open. */
  isOpen: boolean;
  /** Opens the drawer programmatically. */
  open: () => void;
  /** Closes the drawer programmatically. */
  close: () => void;
  /** Toggles the drawer's open/closed state. */
  toggle: () => void;
  /** Reference to the dialog element used for the drawer. Equal to `dialogueRef` prop, if it was passed, else a new ref is generated. */
  dialogueRef: RefObject<HTMLDialogElement | null>;
}

export interface DrawerProps extends UseDrawerProps {
  /** A unique identifier for the main Drawer element */
  id?: string;
  /** Inline styles for the main Drawer element */
  style?: CSSProperties;
  /** Optional additional CSS classes to apply to the drawer container. */
  className?: string;
  /** Content to be rendered inside the drawer. */
  children: ReactNode;
  /** The side from which the drawer appears. Defaults to 'right'. */
  position?: "left" | "right";
  /** Optional title for the drawer, used for the visible header and accessibility. */
  title?: string;
  /** A unique identifier for the title element, used for aria-labelledby. Required if 'title' prop is used. */
  titleId?: string;
  /**
   * Whether to allow the contents of the drawer to overflow the dialogue element.
   * This is useful for cases where drawer contents may bleed outside the drawer (such as using a tooltip or contextual menu)
   * In such cases, the overflowing element should be a child of the dialogue (not the body).
   * */
  enableOverflow?: boolean;
}
