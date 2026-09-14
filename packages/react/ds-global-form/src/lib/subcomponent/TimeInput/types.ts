import type { ComponentProps } from "react";

type OwnProps = {
  /** Minimum time value (HH:MM format) */
  min?: string;

  /** Maximum time value (HH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

/** Props for the presentational time input (no react-hook-form). Renders an
 * `<input type="time">` as its root. */
export type TimeInputProps = OwnProps &
  Omit<ComponentProps<"input">, keyof OwnProps>;
