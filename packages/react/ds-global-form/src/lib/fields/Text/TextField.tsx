import { Text } from "../../inputs/Text/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { TextProps } from "./types.js";

/**
 * Text input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<TextProps>(bindField<TextProps>(Text, "native"));
