import type React from "react";

type NativeDateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalDateProps = {
  /** Minimum date value (YYYY-MM-DD format) */
  min?: string;

  /** Maximum date value (YYYY-MM-DD format) */
  max?: string;
};

/** Props for the presentational date input (no react-hook-form). */
export type DateInputPresentationProps = NativeDateInputProps &
  AdditionalDateProps;
