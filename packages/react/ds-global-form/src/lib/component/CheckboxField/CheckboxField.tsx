import bindField from "#lib/common/bindField/index.js";
import ToggleWrapper from "#lib/common/Wrapper/ToggleWrapper.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { CheckboxInput } from "#lib/subcomponent/CheckboxInput/index.js";
import type { CheckboxFieldProps } from "./types.js";

/**
 * CheckboxInput bound to react-hook-form, wrapped with the toggle field chrome
 * (inline label, optional heading, description, error) and
 * middleware/conditional-display support.
 *
 * `import { CheckboxField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<CheckboxFieldProps>(
  bindField<CheckboxFieldProps>(CheckboxInput, "native"),
  undefined,
  ToggleWrapper,
);
