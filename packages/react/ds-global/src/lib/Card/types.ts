import type { HTMLAttributes } from "react";

/**
 * Card-specific emphasis values.
 * Note: These differ from the standard emphasis modifier family
 * as Card uses "neutral" (default) and "highlighted" for visual distinction.
 */
export type CardEmphasis = "neutral" | "highlighted";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual emphasis for the card.
   * - "neutral": Default appearance
   * - "highlighted": Increased visual prominence
   */
  emphasis?: CardEmphasis;
}
