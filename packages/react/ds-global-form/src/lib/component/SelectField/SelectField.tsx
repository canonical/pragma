import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { SelectInput } from "../../subcomponent/SelectInput/index.js";
import type { SelectFieldProps } from "./types.js";

/**
 * SelectInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { SelectField } from "@canonical/react-ds-global-form";`
 *
 * @implements ds:global.component.select_field
 */
export default withWrapper<SelectFieldProps>(
  bindField<SelectFieldProps>(SelectInput, "native"),
);
