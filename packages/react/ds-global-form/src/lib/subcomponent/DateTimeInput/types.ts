import type { ComponentProps } from "react";

type OwnProps = {
  /** Minimum datetime value (YYYY-MM-DDTHH:MM format) */
  min?: string;

  /** Maximum datetime value (YYYY-MM-DDTHH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

/** Props for the presentational datetime-local input (no react-hook-form).
 * Renders an `<input type="datetime-local">` as its root. */
export type DateTimeInputProps = OwnProps &
  Omit<ComponentProps<"input">, keyof OwnProps>;
