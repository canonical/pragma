import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { CheckboxInput } from "#lib/subcomponent/CheckboxInput/index.js";
import type { CheckboxFieldProps } from "./types.js";

/**
 * CheckboxInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { CheckboxField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<CheckboxFieldProps>(
  bindField<CheckboxFieldProps>(CheckboxInput, "native"),
);
