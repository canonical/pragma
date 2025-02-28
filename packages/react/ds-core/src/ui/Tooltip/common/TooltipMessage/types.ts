/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { RefObject } from "react";

export interface TooltipMessageProps {
  /* A unique identifier for the TooltipMessage */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Child elements */
  children?: React.ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;

  ref: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  zIndex?: number;
}
