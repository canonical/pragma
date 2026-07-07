import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { SwitchInput } from "#lib/subcomponent/SwitchInput/index.js";
import type { SwitchFieldProps } from "./types.js";

/**
 * SwitchInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { SwitchField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<SwitchFieldProps>(
  bindField<SwitchFieldProps>(SwitchInput, "native"),
);
