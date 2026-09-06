import type { ComponentProps } from "react";

type OwnProps = {
  /** Minimum date value (YYYY-MM-DD format) */
  min?: string;

  /** Maximum date value (YYYY-MM-DD format) */
  max?: string;
};

/** Props for the presentational date input (no react-hook-form). Renders an
 * `<input type="date">` as its root. */
export type DateInputProps = OwnProps &
  Omit<ComponentProps<"input">, keyof OwnProps>;
