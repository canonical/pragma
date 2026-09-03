import type { DialogHTMLAttributes, ReactNode } from "react";

/**
 * Props for SidePanel.
 *
 * `open` is controlled: the panel mirrors the prop onto the DOM and reports
 * every dismissal request through `onOpenChange`, but never closes itself.
 */
export interface SidePanelProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "children"> {
  /** Whether the panel is open. */
  open: boolean;
  /**
   * Called when the panel asks to be closed — the close button, Escape, or an
   * outside press when `closeOnOutsideClick` is enabled.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Close when Escape is pressed while focus is inside the panel. Defaults to
   * true. Focus outside the panel belongs to the application, so Escape there
   * is deliberately not intercepted.
   */
  closeOnEscape?: boolean;
  /**
   * Close when a pointer press lands outside the panel. Defaults to **false**,
   * unlike a modal dialog: the application behind stays interactive, so a press
   * in it is ordinary work rather than a dismissal gesture. Opt in only where
   * the panel is genuinely transient.
   */
  closeOnOutsideClick?: boolean;
  /**
   * Panel contents. Compose from `SidePanel.Header`, `SidePanel.Content` and
   * `SidePanel.Footer`; the header and footer stay put while the content
   * scrolls.
   */
  children: ReactNode;
}
