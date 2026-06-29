import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { TextInput } from "#lib/subcomponent/TextInput/index.js";
import type { TextFieldProps } from "./types.js";

/**
 * TextInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TextFieldProps>(
  bindField<TextFieldProps>(TextInput, "native"),
);
