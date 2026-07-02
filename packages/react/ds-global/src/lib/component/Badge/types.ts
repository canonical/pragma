import type { ModifierFamily } from "@canonical/ds-types";
import type { HumanizeNumberOptions, PluralizeOptions } from "@canonical/utils";
import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Numeric value to be displayed.
   */
  value: number;

  /**
   * Visual criticality modifier for the badge, reflecting status.
   * - "success": Positive status
   * - "error": Negative status
   * - "warning": Cautionary status
   * - "information": Informative status
   *
   * When omitted, the badge uses its default styling.
   */
  criticality?: ModifierFamily<"criticality">;

  /**
   * Options for humanizing the numeric value displayed in the badge.
   */
  humanizeOptions?: HumanizeNumberOptions;

  /**
   * Options for the pluralization of the item being counted.
   */
  pluralizeOptions?: PluralizeOptions;
}

export type UseBadgeProps = Pick<
  BadgeProps,
  "value" | "humanizeOptions" | "pluralizeOptions"
>;

/**
 * Result of the useBadge hook.
 * Contains the formatted display value and ARIA label for accessibility.
 */
export interface UseBadgeResult {
  /** Formatted value to be displayed in the badge */
  displayValue: string | number;
  /** Title attribute, for displaying additional context about the badge on hover */
  title: string;
}
