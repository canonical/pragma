import { Select } from "../../inputs/Select/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { SelectProps } from "./types.js";

/**
 * Select input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<SelectProps>(
  bindField<SelectProps>(Select, "native"),
);
