import bindField from "../../common/bindField/index.js";
import { InvisibleWrapper, withWrapper } from "../../common/Wrapper/index.js";
import { HiddenInput } from "../../subcomponent/HiddenInput/index.js";
import type { HiddenFieldProps } from "./types.js";

/**
 * HiddenInput bound to react-hook-form. Uses InvisibleWrapper so no label,
 * description, or error chrome is rendered.
 *
 * `import { HiddenField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<HiddenFieldProps>(
  bindField<HiddenFieldProps>(HiddenInput, "native"),
  {},
  InvisibleWrapper,
);
