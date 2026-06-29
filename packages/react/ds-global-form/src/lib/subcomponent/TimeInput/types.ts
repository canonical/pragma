import type React from "react";

type NativeDateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalTimeProps = {
  /** Minimum time value (HH:MM format) */
  min?: string;

  /** Maximum time value (HH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

/** Props for the presentational time input (no react-hook-form). */
export type TimeInputProps = NativeDateInputProps & AdditionalTimeProps;
