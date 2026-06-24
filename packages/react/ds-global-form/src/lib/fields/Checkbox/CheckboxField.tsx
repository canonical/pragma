import { Checkbox } from "../../inputs/Checkbox/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { CheckboxProps } from "./types.js";

/**
 * Checkbox input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<CheckboxProps>(
  bindField<CheckboxProps>(Checkbox, "native"),
);
