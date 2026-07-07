import type React from "react";

/** The number of stars offered. Ratings are conventionally out of 5 or 10. */
export type RatingScale = 5 | 10;

/**
 * Props for the presentational RatingInput (no react-hook-form). The control is
 * a radio group under the hood — a single-select from `count` options — so it
 * inherits native keyboard support and screen-reader announcements; the props
 * mirror a controlled/uncontrolled radio group rather than a single input.
 */
export interface RatingInputProps {
  /** A unique identifier for the group. */
  id?: string;
  /** Additional CSS classes on the group wrapper. */
  className?: string;
  style?: React.CSSProperties;
  /**
   * The radio group name — shared by every star so they form one group. Also
   * used to derive per-star input ids.
   */
  name: string;
  /** How many stars to offer. @default 5 */
  count?: RatingScale;
  /**
   * Allow half-star ratings. Each star splits into two selectable halves, so
   * the value can be 0.5, 1, 1.5 … up to `count`. @default false
   */
  allowHalf?: boolean;
  /**
   * The selected rating (controlled): 1..count, or in half steps (0.5, 1, 1.5,
   * …) when `allowHalf` is set.
   */
  value?: number;
  /** The initial rating (uncontrolled), same scale as `value`. */
  defaultValue?: number;
  /** Called with the newly selected rating when a star (or half) is chosen. */
  onChange?: (value: number) => void;
  /** Disables the whole group. */
  disabled?: boolean;
  /**
   * Accessible name for the group (e.g. "Rate this article"). Falls back to
   * "Rating" — always provide a meaningful one in context.
   */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /**
   * How each star is named to assistive technology. Receives the star's value
   * and the total; defaults to "{value} of {count} stars".
   */
  formatStarLabel?: (value: number, count: number) => string;
}
