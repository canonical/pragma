import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { TimeInput } from "#lib/subcomponent/TimeInput/index.js";
import type { TimeInputFieldProps } from "./types.js";

/**
 * Time input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TimeInputFieldProps>(
  bindField<TimeInputFieldProps>(TimeInput, "native"),
);
