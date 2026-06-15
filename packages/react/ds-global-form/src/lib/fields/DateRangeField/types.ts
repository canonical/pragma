import type { RegisterOptions } from "react-hook-form";
import type { BaseProps } from "../types.js";

/**
 * Standalone two-field date range (e.g. arrival / departure). Binds TWO
 * react-hook-form fields (startName, endName), so it is NOT a `Field` router
 * input — it is exported alongside `Form`/`Field` and used directly.
 */
export type DateRangeFieldProps = BaseProps & {
  /** Form field name for the start (e.g. arrival) date. */
  startName: string;
  /** Form field name for the end (e.g. departure) date. */
  endName: string;
  /** Group label rendered above both fields. */
  label?: string;
  /** Accessible label for the start field. Defaults to "Start". */
  startLabel?: string;
  /** Accessible label for the end field. Defaults to "End". */
  endLabel?: string;
  description?: string;
  /** ISO-8601 min/max applied to both fields and the calendar. */
  minValue?: string;
  maxValue?: string;
  isOptional?: boolean;
  isDisabled?: boolean;
  /** Extra react-hook-form rules merged into both fields. */
  registerProps?: RegisterOptions;
};
