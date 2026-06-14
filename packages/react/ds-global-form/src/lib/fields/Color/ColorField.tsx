import { Color } from "../../inputs/Color/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { ColorProps } from "./types.js";

/**
 * Color bound to react-hook-form (controlled), wrapped with field chrome.
 * The `defaultValue` preserves the registration default the original leaf set
 * in `useController` (`"#000000"`).
 */
export default withWrapper<ColorProps>(
  bindField<ColorProps>(Color, "controlled", { defaultValue: "#000000" }),
);
