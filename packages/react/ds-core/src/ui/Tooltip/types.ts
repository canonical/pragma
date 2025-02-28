/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import type { ReactNode } from "react";
import type { POSITION_MAP } from "./Tooltip.js";

export type Position = keyof typeof POSITION_MAP;

export interface TooltipProps {
  /* A unique identifier for the Tooltip */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /**
   * Tooltip trigger. When focused or hovered, the message will be shown.
   */
  children?: ReactNode;
  /**
   * Message to display when the element is hovered.
   */
  message?: ReactNode;
  /* Inline styles */
  style?: React.CSSProperties;
  /**
   * Whether the tooltip should adjust to fit in the screen. Defaults to false.
   */
  autoAdjust?: boolean;
  /**
   * Position of the tooltip relative to the element.
   */
  position?: Position;
  /**
   * Delay in ms after which Tooltip will appear (defaults to 350ms).
   */
  showDelay?: number;
  /**
   * Delay in ms after which Tooltip will disappear (defaults to 350ms).
   */
  hideDelay?: number;
  /**
   * z-index of the tooltip.
   */
  zIndex?: number;
}
