import type { CSSProperties, ReactNode } from "react";
import type { FloatingAnchorProps } from "../FloatingAnchor/types.js";

/**
 * Props for the Popover component.
 * Composes `FloatingAnchor` with click-trigger defaults and a
 * `role="dialog"` floating panel.
 */
export interface PopoverProps
  extends Omit<
    FloatingAnchorProps,
    "content" | "renderContent" | "trigger" | "ariaRelationship"
  > {
  /** The content rendered inside the popover panel */
  content: ReactNode;
  /** Class name applied to the popover panel element */
  contentClassName?: string;
  /** Styles applied to the popover panel element */
  contentStyle?: CSSProperties;
}
