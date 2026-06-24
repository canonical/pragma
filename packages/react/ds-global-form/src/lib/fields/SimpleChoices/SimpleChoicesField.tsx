import { SimpleChoices } from "../../inputs/SimpleChoices/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { SimpleChoicesProps } from "./types.js";

/**
 * SimpleChoices bound to react-hook-form (controlled), wrapped with field
 * chrome. The label is mocked into the fieldset legend, as the "true" label is
 * rendered by the individual options.
 */
export default withWrapper<SimpleChoicesProps>(
  bindField<SimpleChoicesProps>(SimpleChoices, "controlled"),
  { mockLabel: true },
);
