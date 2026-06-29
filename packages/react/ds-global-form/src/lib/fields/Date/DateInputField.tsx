import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { DateInput } from "#lib/subcomponent/DateInput/index.js";
import type { DateInputProps } from "./types.js";

/**
 * Date input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<DateInputProps>(
  bindField<DateInputProps>(DateInput, "native"),
);
