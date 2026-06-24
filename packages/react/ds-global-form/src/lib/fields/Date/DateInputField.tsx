import { DateInput } from "../../inputs/Date/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { DateInputProps } from "./types.js";

/**
 * Date input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<DateInputProps>(
  bindField<DateInputProps>(DateInput, "native"),
);
