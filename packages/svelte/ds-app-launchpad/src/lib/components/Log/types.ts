/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { SvelteHTMLElements } from "svelte/elements";

type CommonLogProps = SvelteHTMLElements["table"] & {
  /**
   * If true, timestamps won't be shown in log lines.
   *
   * @default false
   */
  hideTimestamps?: boolean;
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
};

interface DefaultFormatterLogProps extends CommonLogProps {
  /**
   * Allows displaying timestamps in UTC, runtime local time, or an explicit timezone.
   *
   * Uses `YYYY-MM-DD HH:mm:ss.SSS` format for all timezones.
   *
   * In SSR, `local` resolves to the server runtime timezone and may differ from the browser timezone during hydration.
   * For deterministic SSR output in a user timezone, pass an explicit timezone (for example `Europe/Warsaw`).
   * Invalid timezones will fall back to UTC.
   *
   * @default "UTC"
   *
   * Has no effect if `timestampFormatter` is provided.
   */
  timeZone?: TimeZone;
  timestampFormatter?: never;
}

interface CustomFormatterLogProps extends CommonLogProps {
  /**
   * A custom timestamp formatter. If provided, this will be used instead of the default timestamp formatting.
   *
   * `timeZone` prop is ignored when using a custom formatter, as it's assumed that the custom formatter will handle timezones internally if needed.
   */
  timestampFormatter: { format: (date: Date) => string };
  timeZone?: never;
}

export type LogProps = DefaultFormatterLogProps | CustomFormatterLogProps;

export type LogContext = {
  timeZone: TimeZone;
  hideTimestamps: boolean;
  wrapLines: boolean;
  timestampFormatter?: { format: (date: Date) => string };
};

type ExplicitTimeZone = Exclude<
  Intl.DateTimeFormatOptions["timeZone"],
  undefined
>;

export type TimeZone = "UTC" | "local" | ({} & ExplicitTimeZone);
