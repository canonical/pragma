/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = SvelteHTMLElements["table"];

export interface LogProps extends BaseProps {
  /**
   * If true, timestamps won't be shown in log lines.
   *
   * @default false
   */
  hideTimestamps?: boolean;
  /**
   * Allows for displaying timestamps in either UTC or local time.
   *
   * @default "UTC"
   */
  timeZone?: TimeZone;
  /**
   * If true, long lines will wrap onto multiple lines.
   *
   * @default false
   */
  wrapLines?: boolean;
  /**
   * An optional caption for the log table to provide additional context for assistive technologies. Not visually displayed.
   */
  caption?: string;
}

export type LogContext = {
  timeZone: TimeZone;
  hideTimestamp: boolean;
  wrapLines: boolean;
};

export type TimeZone = "UTC" | "local";
