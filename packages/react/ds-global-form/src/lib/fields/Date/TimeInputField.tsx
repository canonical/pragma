import { TimeInput } from "../../inputs/Date/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { TimeInputProps } from "./types.js";

/**
 * Time input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TimeInputProps>(
  bindField<TimeInputProps>(TimeInput, "native"),
);
