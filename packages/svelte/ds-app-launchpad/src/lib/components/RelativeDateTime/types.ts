/* @canonical/generator-ds 0.17.1 */

import type { SvelteHTMLElements } from "svelte/elements";

type BaseProps = Omit<SvelteHTMLElements["time"], "children">;

export interface RelativeDateTimeProps extends BaseProps {
  /**
   * The moment in time to display.
   * This can be a Date object, a timestamp, or a date string.
   */
  date: Date | string | number;
  /**
   * The threshold in milliseconds below which to display the `nowLabel` label.
   *
   * @default 60_000 (1 minute)
   */
  nowThreshold?: number;
  /**
   * The label to display when the time is within the `nowThreshold`.
   *
   * @default "now"
   */
  nowLabel?: string;
}

export type RelativeTimeFormatValue = {
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
};
