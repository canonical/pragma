import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { TimeInput } from "../../subcomponent/TimeInput/index.js";
import type { TimeFieldProps } from "./types.js";

/**
 * Time input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { TimeField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<TimeFieldProps>(
  bindField<TimeFieldProps>(TimeInput, "native"),
);
