import type {
  CSSProperties,
  FocusEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
} from "react";
import type { BestPosition } from "../hooks/index.js";

export interface TooltipProps {
  /* A unique identifier for the TooltipMessage */
  id?: string;
  /* Additional CSS classes */
  className?: string;
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

  onPointerEnter?: PointerEventHandler;
  onFocus?: FocusEventHandler;
}
