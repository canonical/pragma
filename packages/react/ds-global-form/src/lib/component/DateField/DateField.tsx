import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { DateInput } from "../../subcomponent/DateInput/index.js";
import type { DateFieldProps } from "./types.js";

/**
 * Date input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { DateField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<DateFieldProps>(
  bindField<DateFieldProps>(DateInput, "native"),
);
