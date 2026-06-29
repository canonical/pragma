import bindField from "#lib/common/bindField.js";
import { InvisibleWrapper, withWrapper } from "#lib/common/Wrapper/index.js";
import { HiddenInput } from "#lib/subcomponent/HiddenInput/index.js";
import type { HiddenFieldProps } from "./types.js";

/**
 * HiddenInput bound to react-hook-form. Uses InvisibleWrapper so no label,
 * description, or error chrome is rendered.
 */
export default withWrapper<HiddenFieldProps>(
  bindField<HiddenFieldProps>(HiddenInput, "native"),
  {},
  InvisibleWrapper,
);
