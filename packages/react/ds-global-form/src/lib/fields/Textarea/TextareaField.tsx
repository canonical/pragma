import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { Textarea } from "../../inputs/Textarea/index.js";
import type { TextareaProps } from "./types.js";

/**
 * Textarea input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TextareaProps>(
  bindField<TextareaProps>(Textarea, "native"),
);
