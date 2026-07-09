import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { DateTimeInput } from "../../subcomponent/DateTimeInput/index.js";
import type { DateTimeFieldProps } from "./types.js";

/**
 * DateTime input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { DateTimeField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<DateTimeFieldProps>(
  bindField<DateTimeFieldProps>(DateTimeInput, "native"),
);
