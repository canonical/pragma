import type { HTMLAttributes, ReactNode } from "react";

export interface SideNavigationProps extends HTMLAttributes<HTMLDivElement> {
  /** Brand content (logo/wordmark) rendered in the header. */
  brand?: ReactNode;
  /** Main navigation content. */
  children?: ReactNode;
  /** Footer navigation content, pinned to the bottom. */
  footer?: ReactNode;
  /**
   * Whether the navigation is expanded. Provide together with
   * `onExpandedChange` for a controlled component; omit for uncontrolled (see
   * `defaultExpanded`).
   */
  expanded?: boolean;
  /** Initial expanded state when uncontrolled. Defaults to `true`. */
  defaultExpanded?: boolean;
  /**
   * Called when the collapse toggle is activated, with the next expanded state.
   * Named to avoid clashing with the native `onToggle` DOM event handler.
   */
  onExpandedChange?: (expanded: boolean) => void;
}
