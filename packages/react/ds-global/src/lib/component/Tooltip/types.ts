import type {
  CSSProperties,
  FocusEventHandler,
  PointerEventHandler,
  ReactNode,
  RefObject,
} from "react";

export interface TooltipProps {
  /* A unique identifier for the TooltipMessage */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children: ReactNode;
  /**
   * An optional leading icon, rendered before the text and top-aligned with the
   * first line (Figma: 16px glyph, dimension-100 gap). Pass any glyph node
   * (e.g. an `<Icon>` or inline SVG).
   */
  icon?: ReactNode;
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
