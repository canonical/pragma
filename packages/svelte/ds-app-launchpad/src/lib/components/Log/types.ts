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
   * Allows displaying timestamps in UTC, runtime local time, or an explicit timezone.
   *
   * In SSR, `local` resolves to the server runtime timezone and may differ from the browser timezone during hydration.
   * For deterministic SSR output in a user timezone, pass an explicit timezone (for example `Europe/Warsaw`).
   * Invalid timezones will fall back to UTC.
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
  hideTimestamps: boolean;
  wrapLines: boolean;
};

type ExplicitTimeZone = Exclude<
  Intl.DateTimeFormatOptions["timeZone"],
  undefined
>;

export type TimeZone = "UTC" | "local" | ({} & ExplicitTimeZone);
