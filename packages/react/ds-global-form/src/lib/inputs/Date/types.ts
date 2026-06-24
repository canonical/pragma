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

type AdditionalTimeProps = {
  /** Minimum time value (HH:MM format) */
  min?: string;

  /** Maximum time value (HH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

/** Props for the presentational time input (no react-hook-form). */
export type TimeInputPresentationProps = NativeDateInputProps &
  AdditionalTimeProps;

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
