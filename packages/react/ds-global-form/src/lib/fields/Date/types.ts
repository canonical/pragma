import type { DateInputPresentationProps } from "#lib/subcomponent/DateInput/index.js";
import type { DateTimeInputPresentationProps } from "#lib/subcomponent/DateTimeInput/index.js";
import type { TimeInputPresentationProps } from "#lib/subcomponent/TimeInput/index.js";
import type { InputProps } from "../types.js";

/** Props for the react-hook-form-bound date field (presentational + binding). */
export type DateInputProps = InputProps<DateInputPresentationProps>;

/** Props for the react-hook-form-bound time field (presentational + binding). */
export type TimeInputProps = InputProps<TimeInputPresentationProps>;

/** Props for the react-hook-form-bound datetime field (presentational + binding). */
export type DateTimeInputProps = InputProps<DateTimeInputPresentationProps>;
