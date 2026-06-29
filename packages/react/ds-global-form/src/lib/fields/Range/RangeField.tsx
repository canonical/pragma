import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { RangeInput } from "#lib/subcomponent/RangeInput/index.js";
import type { RangeProps } from "./types.js";

/**
 * RangeInput bound to react-hook-form. The live field value is injected into
 * the presentational `<output>` via bindField's `injectValue`.
 */
export default withWrapper<RangeProps>(
  bindField<RangeProps>(RangeInput, "native", { injectValue: true }),
);
