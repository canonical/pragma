import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { RatingInput } from "../../subcomponent/RatingInput/index.js";
import type { RatingFieldProps } from "./types.js";

/**
 * RatingInput bound to react-hook-form (controlled), wrapped with the field
 * chrome (label, description, error) and middleware/conditional-display support.
 * The numeric rating is owned by the field.
 *
 * `import { RatingField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<RatingFieldProps>(
  bindField<RatingFieldProps>(RatingInput, "controlled"),
);
