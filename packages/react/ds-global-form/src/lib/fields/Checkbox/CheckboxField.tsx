import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { CheckboxInput } from "#lib/subcomponent/CheckboxInput/index.js";
import type { CheckboxProps } from "./types.js";

/**
 * CheckboxInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<CheckboxProps>(
  bindField<CheckboxProps>(CheckboxInput, "native"),
);
