import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { Checkbox } from "../../inputs/Checkbox/index.js";
import type { CheckboxProps } from "./types.js";

/**
 * Checkbox input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<CheckboxProps>(
  bindField<CheckboxProps>(Checkbox, "native"),
);
