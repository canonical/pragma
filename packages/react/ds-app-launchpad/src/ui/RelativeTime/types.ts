/* @canonical/generator-ds 0.9.0-experimental.4 */
import { type Temporal } from "@js-temporal/polyfill";
import type React from "react";

export interface RelativeTimeProps {
  /* A unique identifier for the RelativeTime */
  id?: string;
  /* Additional CSS classes */
  className?: string;

  /* Inline styles */
  style?: React.CSSProperties;

  /**
   * The time to be displayed as a relative time (ISO string or Date object).
   */
  time: string | Date | Temporal.Instant;

  /**
   * Whether to update the displayed relative time every second (default is true).
   */
  updateLive?: boolean;

  /**
   * custom relative time format (default: local language and narrow style).
   */
  relativeTimeFormat?: Intl.RelativeTimeFormat;

  /**
   * The threshold in seconds for when to display the relative time as "just now" (default is 10).
   */
  nowThreshold?: number;
}
