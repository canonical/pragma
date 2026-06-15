import type { CalendarDate } from "@internationalized/date";
import type { BaseProps } from "../types.js";

/** Common aria props the field tier injects (id + labelling). */
export type DatePickerAriaProps = {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Presentational segmented date field (month/day/year spinbutton segments).
 * Controlled by an @internationalized/date CalendarDate.
 */
export type DateFieldProps = BaseProps &
  DatePickerAriaProps & {
    value: CalendarDate | null;
    onChange: (value: CalendarDate | null) => void;
    onBlur?: () => void;
    minValue?: CalendarDate;
    maxValue?: CalendarDate;
    isDisabled?: boolean;
    /** Locale for segment order / formatting. Defaults to the document locale. */
    locale?: string;
  };

/** Presentational month-grid calendar with single-date selection. */
export type CalendarProps = BaseProps & {
  value: CalendarDate | null;
  onChange: (value: CalendarDate) => void;
  /** Date to focus when no value is set (defaults to today). */
  focusedValue?: CalendarDate;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  isDateUnavailable?: (date: CalendarDate) => boolean;
  isDisabled?: boolean;
  locale?: string;
};

/** An inclusive date range. */
export type DateRange = { start: CalendarDate; end: CalendarDate };

/**
 * Presentational month-grid calendar with contiguous range selection
 * (two-click anchor + hover preview).
 */
export type RangeCalendarProps = BaseProps & {
  value: DateRange | null;
  onChange: (value: DateRange) => void;
  focusedValue?: CalendarDate;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  isDateUnavailable?: (date: CalendarDate) => boolean;
  isDisabled?: boolean;
  locale?: string;
};

/**
 * Presentational DatePicker (segmented field + popover calendar). Controlled by
 * an ISO-8601 string ("YYYY-MM-DD") so it binds cleanly to react-hook-form and
 * submits natively; conversion to/from CalendarDate happens at this boundary.
 */
export type DatePickerPresentationProps = BaseProps &
  DatePickerAriaProps & {
    value?: string;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    /** ISO-8601 min/max. */
    minValue?: string;
    maxValue?: string;
    isDisabled?: boolean;
    isDateUnavailable?: (date: CalendarDate) => boolean;
    locale?: string;
  };
