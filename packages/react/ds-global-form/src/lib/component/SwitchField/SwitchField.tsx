import bindField from "../../common/bindField/index.js";
import type { InputProps } from "../../common/types.js";
import withToggleWrapper from "../../common/Wrapper/withToggleWrapper.js";
import type { SwitchInputProps } from "../../subcomponent/SwitchInput/index.js";
import { SwitchInput } from "../../subcomponent/SwitchInput/index.js";

type SwitchInputFieldProps = InputProps<SwitchInputProps>;

/**
 * SwitchInput bound to react-hook-form, wrapped with the toggle field chrome
 * (inline label, optional heading, description, error) and
 * middleware/conditional-display support. Requires at least one of
 * `label`/`controlLabel`.
 *
 * The label defaults to the LEFT of the switch (`labelPosition: "before"`): a
 * label before a switch names its purpose, which is the switch convention (a
 * label after would read as the switch's state). Callers can override with
 * `labelPosition="after"`.
 *
 * `import { SwitchField } from "@canonical/react-ds-global-form";`
 */
export default withToggleWrapper<SwitchInputFieldProps>(
  bindField<SwitchInputFieldProps>(SwitchInput, "native"),
  { labelPosition: "before" },
);
