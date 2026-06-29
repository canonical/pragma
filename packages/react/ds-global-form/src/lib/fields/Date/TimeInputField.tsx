import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { TimeInput } from "#lib/subcomponent/TimeInput/index.js";
import type { TimeInputProps } from "./types.js";

/**
 * Time input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TimeInputProps>(
  bindField<TimeInputProps>(TimeInput, "native"),
);
