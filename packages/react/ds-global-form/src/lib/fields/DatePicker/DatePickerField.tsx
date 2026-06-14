import { DatePicker } from "../../inputs/DatePicker/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { DatePickerProps } from "./types.js";

/**
 * DatePicker bound to react-hook-form (controlled), wrapped with field chrome.
 * The field value is an ISO-8601 string ("YYYY-MM-DD"), like the native
 * DateInput — conversion to/from CalendarDate happens inside the presentational
 * DatePicker.
 */
export default withWrapper<DatePickerProps>(
  bindField<DatePickerProps>(DatePicker, "controlled"),
);
