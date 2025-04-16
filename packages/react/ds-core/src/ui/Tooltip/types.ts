import type {
  CSSProperties,
  FocusEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
} from "react";

export interface TooltipProps {
  /* ID to apply to the positioning element */
  positionElementId?: string;
  /* Class name to apply to the positioning element */
  positionElementClassName?: string;
  /* ID to apply to the message element */
  messageElementId?: string;
  /* Class name to apply to the message element */
  messageElementClassName?: string;
  /* Child elements */
  children: ReactNode;
  /* Inline styles */
  style?: CSSProperties;
  /** Whether the tooltip is open or not */
  isOpen?: boolean;
  /** Ref to the tooltip, useful for calculating its dimensions */
  ref?: RefObject<HTMLDivElement | null>;
  /** The z-index of the tooltip */
  zIndex?: number;
  /* Event handler for pointer enter */
  onPointerEnter?: PointerEventHandler;
  /* Event handler for focus */
  onFocus?: FocusEventHandler;
}
