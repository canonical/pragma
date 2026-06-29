import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { TextInput } from "#lib/subcomponent/TextInput/index.js";
import type { TextProps } from "./types.js";

/**
 * TextInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TextProps>(
  bindField<TextProps>(TextInput, "native"),
);
