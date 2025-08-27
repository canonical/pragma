/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { PluralizeOptions } from "@canonical/utils";
import type React from "react";
import type { SemanticStatus } from "../../types/index.js";

export interface BadgeProps extends Partial<Pick<HTMLSpanElement, "role">> {
  /* A unique identifier for the Badge */
  id?: string;
  /* Additional CSS classes */
  className?: string;
  /* Inline styles */
  style?: React.CSSProperties;

  itemOptions?: PluralizeOptions;

  /**
   * Numeric value to be displayed.
   */
  value: number;

  /**
   * Visual appearance of the badge, typically reflecting status.
   * - "neutral": Neutral appearance (default).
   * - "positive": Indicates a positive status
   * - "negative": Indicates a negative status
   * - "caution": Indicates a cautionary status
   * - "informative": Indicates an informative status
   */
  appearance?: SemanticStatus;

  /**
   * Overflow strategy for the badge value
   * - "truncate": Displays the value, up to the maximum (999), with a + if it exceeds 999.
   * - "compact": Rounds the value to the nearest thousand, million, billion, trillion, and formats it accordingly (e.g., 1.2k, 132M, etc.).
   */
  overflowStrategy?: "truncate" | "compact";
}

export type UseBadgeProps = Pick<
  BadgeProps,
  "value" | "overflowStrategy" | "itemOptions"
>;

/**
 * Result of the useBadge hook.
 * Contains the formatted display value and ARIA label for accessibility.
 */
export interface UseBadgeResult {
  /** Formatted value to be displayed in the badge */
  displayValue: string | number;
  /** ARIA label for accessibility, describing the value */
  ariaLabel: string;
}
