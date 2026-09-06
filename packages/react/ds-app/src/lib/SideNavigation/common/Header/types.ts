import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Brand content (logo mark) rendered at the start of the header. */
  brand?: ReactNode;
  /** Optional application name/wordmark shown beside the brand. Omitted when absent. */
  applicationName?: ReactNode;
  /** Whether the navigation is currently expanded. Passed to the collapse toggle. */
  expanded?: boolean;
  /** Handler invoked when the collapse toggle is activated. When omitted, the toggle is not rendered. */
  onToggle?: () => void;
  /** id of the navigation region the collapse toggle controls (`aria-controls`). */
  collapseControls?: string;
};

// The root is a `<header>` landmark, not a `<div>` — the previous
// `HTMLAttributes<HTMLDivElement>` named an element this component has never
// rendered.
export type HeaderProps = OwnProps &
  Omit<ComponentProps<"header">, keyof OwnProps>;
