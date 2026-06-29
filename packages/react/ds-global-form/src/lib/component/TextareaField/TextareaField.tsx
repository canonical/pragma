import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { TextareaInput } from "#lib/subcomponent/TextareaInput/index.js";
import type { TextareaFieldProps } from "./types.js";

/**
 * TextareaInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TextareaFieldProps>(
  bindField<TextareaFieldProps>(TextareaInput, "native"),
);
