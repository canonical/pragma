import bindField from "#lib/common/bindField.js";
import { InvisibleWrapper, withWrapper } from "#lib/common/Wrapper/index.js";
import { HiddenInput } from "#lib/subcomponent/HiddenInput/index.js";
import type { HiddenProps } from "./types.js";

/**
 * HiddenInput bound to react-hook-form. Uses InvisibleWrapper so no label,
 * description, or error chrome is rendered.
 */
export default withWrapper<HiddenProps>(
  bindField<HiddenProps>(HiddenInput, "native"),
  {},
  InvisibleWrapper,
);
