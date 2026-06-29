import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { SelectInput } from "#lib/subcomponent/SelectInput/index.js";
import type { SelectFieldProps } from "./types.js";

/**
 * SelectInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<SelectFieldProps>(
  bindField<SelectFieldProps>(SelectInput, "native"),
);
