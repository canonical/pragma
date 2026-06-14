import type { InputProps } from "../../types.js";

type NativeDateInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type AdditionalDateProps = {
  /** Minimum date value (YYYY-MM-DD format) */
  min?: string;

  /** Maximum date value (YYYY-MM-DD format) */
  max?: string;
};

export type DateInputProps = InputProps<
  NativeDateInputProps & AdditionalDateProps
>;

type AdditionalTimeProps = {
  /** Minimum time value (HH:MM format) */
  min?: string;

  /** Maximum time value (HH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

export type TimeInputProps = InputProps<
  NativeDateInputProps & AdditionalTimeProps
>;

type AdditionalDateTimeProps = {
  /** Minimum datetime value (YYYY-MM-DDTHH:MM format) */
  min?: string;

  /** Maximum datetime value (YYYY-MM-DDTHH:MM format) */
  max?: string;

  /** Step interval in seconds */
  step?: number;
};

export type DateTimeInputProps = InputProps<
  NativeDateInputProps & AdditionalDateTimeProps
>;
