import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { ColorInput } from "#lib/subcomponent/ColorInput/index.js";
import type { ColorProps } from "./types.js";

/**
 * ColorInput bound to react-hook-form (controlled), wrapped with field chrome.
 * The `defaultValue` preserves the registration default the original leaf set
 * in `useController` (`"#000000"`).
 */
export default withWrapper<ColorProps>(
  bindField<ColorProps>(ColorInput, "controlled", { defaultValue: "#000000" }),
);
