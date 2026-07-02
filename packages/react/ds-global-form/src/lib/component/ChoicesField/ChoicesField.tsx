import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { Choices } from "./Choices.js";
import type { ChoicesFieldProps } from "./types.js";

/**
 * Choices bound to react-hook-form (controlled), wrapped with field
 * chrome. The label is mocked into the fieldset legend, as the "true" label is
 * rendered by the individual options.
 */
export default withWrapper<ChoicesFieldProps>(
  bindField<ChoicesFieldProps>(Choices, "controlled"),
  { mockLabel: true },
);
