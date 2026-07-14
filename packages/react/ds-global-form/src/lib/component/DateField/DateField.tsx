import type { RegisterOptions } from "react-hook-form";
import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { DateInput } from "../../subcomponent/DateInput/index.js";
import type { DateFieldProps } from "./types.js";

/**
 * Turn the `min`/`max` date props into react-hook-form `min`/`max` rules so an
 * out-of-range date reports an inline error — the native attributes alone only
 * constrain the picker UI and never reach RHF. ISO `YYYY-MM-DD` strings compare
 * lexicographically, so the native rule works directly on the stored value.
 */
const dateRangeRules = ({
  min,
  max,
}: Record<string, unknown>): RegisterOptions => {
  const rules: RegisterOptions = {};
  if (typeof min === "string" && min) {
    rules.min = { value: min, message: `Date must be on or after ${min}.` };
  }
  if (typeof max === "string" && max) {
    rules.max = { value: max, message: `Date must be on or before ${max}.` };
  }
  return rules;
};

/**
 * Date input bound to react-hook-form, wrapped with field chrome
 * (label, description, error) and middleware/conditional-display support.
 *
 * `import { DateField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<DateFieldProps>(
  bindField<DateFieldProps>(DateInput, "native", {
    additionalRegisterProps: dateRangeRules,
  }),
);
