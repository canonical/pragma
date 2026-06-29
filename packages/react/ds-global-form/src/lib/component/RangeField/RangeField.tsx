import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { RangeControl } from "./common/index.js";
import type { RangeFieldProps } from "./types.js";

/**
 * A numeric field offering both precise entry and a slider for one value.
 *
 * The CANONICAL control is the number input — it carries the field `name`/`id`,
 * takes the react-hook-form binding, and is the target of the field's real
 * `<label for>`. The slider is a JS-only mirror that writes through to it (see
 * `RangeControl` for the full a11y / no-JS rationale; spec DE080).
 * `valueAsNumber` so the registered value is a number, not the string the
 * inputs report.
 */
export default withWrapper<RangeFieldProps>(
  bindField<RangeFieldProps>(RangeControl, "native", {
    registerDefaults: { valueAsNumber: true },
  }),
);
