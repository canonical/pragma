/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Severity } from "@canonical/ds-types";
import type { HumanizeNumberOptions, PluralizeOptions } from "@canonical/utils";
import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Numeric value to be displayed.
   */
  value: number;

  /**
   * Visual appearance of the badge, typically reflecting status.
   * Options include:
   * - "positive": Indicates a positive status
   * - "negative": Indicates a negative status
   * - "caution": Indicates a cautionary status
   * - "information": Indicates an informative status
   * // TODO neutral intent is currently defined in a very button-centric way. It should unset other appearances, but it currently applies default button styling.
   *      Possibly we will need to revisit this by binding component variables without component name prefix, so that neutral can reset components to their neutral state.
   *
   * When no appearance is specified, uses the default badge styling.
   */
  appearance?: Exclude<Severity, "neutral">;

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
