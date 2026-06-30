import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { DateTimeInput } from "#lib/subcomponent/DateTimeInput/index.js";
import type { DateTimeFieldProps } from "./types.js";

/**
 * DateTime input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<DateTimeFieldProps>(
  bindField<DateTimeFieldProps>(DateTimeInput, "native"),
);
