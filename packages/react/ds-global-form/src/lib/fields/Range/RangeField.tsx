import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { Range } from "../../inputs/Range/index.js";
import type { RangeProps } from "./types.js";

/**
 * Range input bound to react-hook-form. The live field value is injected into
 * the presentational `<output>` via bindField's `injectValue`.
 */
export default withWrapper<RangeProps>(
  bindField<RangeProps>(Range, "native", { injectValue: true }),
);
