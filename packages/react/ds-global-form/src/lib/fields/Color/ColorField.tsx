import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { Color } from "../../inputs/Color/index.js";
import type { ColorProps } from "./types.js";

/**
 * Color bound to react-hook-form (controlled), wrapped with field chrome.
 * The `defaultValue` preserves the registration default the original leaf set
 * in `useController` (`"#000000"`).
 */
export default withWrapper<ColorProps>(
  bindField<ColorProps>(Color, "controlled", { defaultValue: "#000000" }),
);
