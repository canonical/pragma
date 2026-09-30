import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { TextInput } from "../../subcomponent/TextInput/index.js";
import type { TextFieldProps } from "./types.js";

/**
 * TextInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { TextField } from "@canonical/react-ds-global-form";`
 *
 * @implements ds:global.component.text_field
 */
export default withWrapper<TextFieldProps>(
  bindField<TextFieldProps>(TextInput, "native"),
);
