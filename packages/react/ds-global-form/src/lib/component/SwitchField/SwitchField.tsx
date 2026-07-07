import bindField from "#lib/common/bindField/index.js";
import type { InputProps } from "#lib/common/types.js";
import withToggleWrapper from "#lib/common/Wrapper/withToggleWrapper.js";
import type { SwitchInputProps } from "#lib/subcomponent/SwitchInput/index.js";
import { SwitchInput } from "#lib/subcomponent/SwitchInput/index.js";

type SwitchInputFieldProps = InputProps<SwitchInputProps>;

/**
 * SwitchInput bound to react-hook-form, wrapped with the toggle field chrome
 * (inline label, optional heading, description, error) and
 * middleware/conditional-display support. Requires at least one of
 * `label`/`controlLabel`.
 *
 * `import { SwitchField } from "@canonical/react-ds-global-form";`
 */
export default withToggleWrapper<SwitchInputFieldProps>(
  bindField<SwitchInputFieldProps>(SwitchInput, "native"),
);
