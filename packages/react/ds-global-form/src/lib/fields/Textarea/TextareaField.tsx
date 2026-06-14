import { Textarea } from "../../inputs/Textarea/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { TextareaProps } from "./types.js";

/**
 * Textarea input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TextareaProps>(
  bindField<TextareaProps>(Textarea, "native"),
);
