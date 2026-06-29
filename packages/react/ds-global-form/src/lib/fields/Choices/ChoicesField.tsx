import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import { Choices } from "./Choices.js";
import type { ChoicesProps } from "./types.js";

/**
 * Choices bound to react-hook-form (controlled), wrapped with field chrome.
 * The label is mocked into the fieldset legend, as the per-option labels are
 * rendered by the individual options.
 */
export default withWrapper<ChoicesProps>(
  bindField<ChoicesProps>(Choices, "controlled"),
  { mockLabel: true },
);
