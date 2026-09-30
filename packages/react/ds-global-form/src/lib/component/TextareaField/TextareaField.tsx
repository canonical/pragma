import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { TextareaInput } from "../../subcomponent/TextareaInput/index.js";
import type { TextareaFieldProps } from "./types.js";

/**
 * TextareaInput bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { TextareaField } from "@canonical/react-ds-global-form";`
 *
 * @implements ds:global.component.textarea_field
 */
export default withWrapper<TextareaFieldProps>(
  bindField<TextareaFieldProps>(TextareaInput, "native"),
);
