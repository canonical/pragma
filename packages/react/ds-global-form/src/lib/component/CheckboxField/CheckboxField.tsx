import bindField from "#lib/common/bindField/index.js";
import type { InputProps } from "#lib/common/types.js";
import withToggleWrapper from "#lib/common/Wrapper/withToggleWrapper.js";
import type { CheckboxInputProps } from "#lib/subcomponent/CheckboxInput/index.js";
import { CheckboxInput } from "#lib/subcomponent/CheckboxInput/index.js";

type CheckboxInputFieldProps = InputProps<CheckboxInputProps>;

/**
 * CheckboxInput bound to react-hook-form, wrapped with the toggle field chrome
 * (inline label, optional heading, description, error) and
 * middleware/conditional-display support. Requires at least one of
 * `label`/`controlLabel`.
 *
 * `import { CheckboxField } from "@canonical/react-ds-global-form";`
 */
export default withToggleWrapper<CheckboxInputFieldProps>(
  bindField<CheckboxInputFieldProps>(CheckboxInput, "native"),
);
