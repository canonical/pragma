import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { SimpleChoices } from "./SimpleChoices.js";
import type { SimpleChoicesFieldProps } from "./types.js";

/**
 * SimpleChoices bound to react-hook-form (controlled), wrapped with field
 * chrome. The label is mocked into the fieldset legend, as the "true" label is
 * rendered by the individual options.
 */
export default withWrapper<SimpleChoicesFieldProps>(
  bindField<SimpleChoicesFieldProps>(SimpleChoices, "controlled"),
  { mockLabel: true },
);
