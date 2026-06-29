import type React from "react";

type NativeDateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalDateTimeProps = {
  /** Minimum datetime value (YYYY-MM-DDTHH:MM format) */
  min?: string;

  /** Maximum datetime value (YYYY-MM-DDTHH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

/** Props for the presentational datetime-local input (no react-hook-form). */
export type DateTimeInputPresentationProps = NativeDateInputProps &
  AdditionalDateTimeProps;
