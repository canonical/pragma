/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { HumanizeNumberOptions, PluralizeOptions } from "@canonical/utils";
import type { HTMLAttributes } from "react";
import type { Severity } from "../../types/index.js";

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    PluralizeOptions {
  /**
   * Options for the pluralization of the item being counted.
   * See {@link PluralizeOptions} for details.
   */
  pluralizeOptions?: PluralizeOptions;

  /**
   * Numeric value to be displayed.
   */
  value: number;

  /**
   * Visual appearance of the badge, typically reflecting status.
   * - "positive": Indicates a positive status
   * - "negative": Indicates a negative status
   * - "caution": Indicates a cautionary status
   * - "information": Indicates an informative status
   *
   * When no appearance is specified, uses the default badge styling.
   * Badge excludes "neutral" appearance from the {@link Severity} type as the current neutral intent is not suited for badge (higher contrast than buttons)
   */
  appearance?: Exclude<Severity, "neutral">;

  /**
   * Options for humanizing the numeric value displayed in the badge.
   * See {@link HumanizeNumberOptions} for details on available configuration options.
   *
   * @example
   * // Default behavior (round mode)
   * <Badge value={1500} />
   *
   * // Clamp to maximum of 999 with custom overflow indicator
   * <Badge value={1500} humanizeOptions={{ humanizeType: "clamp", clampOptions: { max: 999 }, overflowIndicator: "+" }} />
   *
   * // Custom units for binary values
   * <Badge value={2048} humanizeOptions={{ magnitudeBase: 1024, units: ["B", "KiB", "MiB"] }} />
   */
  humanizeOptions?: HumanizeNumberOptions;
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
