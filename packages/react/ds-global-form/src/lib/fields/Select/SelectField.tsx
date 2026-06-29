import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { Select } from "../../inputs/Select/index.js";
import type { SelectProps } from "./types.js";

/**
 * Select input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 */
export default withWrapper<SelectProps>(
  bindField<SelectProps>(Select, "native"),
);
