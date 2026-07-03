import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { RichChoices } from "./RichChoices.js";
import type { RichChoicesFieldProps } from "./types.js";

/**
 * RichChoices bound to react-hook-form (controlled), wrapped with field chrome.
 * The label is mocked into the fieldset legend, as the per-option labels are
 * rendered by the individual options.
 *
 * `import { RichChoicesField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<RichChoicesFieldProps>(
  bindField<RichChoicesFieldProps>(RichChoices, "controlled"),
  { mockLabel: true },
);
