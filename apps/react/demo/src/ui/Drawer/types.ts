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
  /** Reference to the dialog element used for the drawer. */
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
  /** Optional additional CSS classes to apply to the drawer contents. */
  contentsClassName?: string;
}
