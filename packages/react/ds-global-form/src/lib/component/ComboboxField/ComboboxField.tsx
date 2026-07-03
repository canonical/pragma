import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { ComboboxInput } from "#lib/subcomponent/ComboboxInput/index.js";
import type { ComboboxFieldProps } from "./types.js";

/**
 * ComboboxInput bound to react-hook-form (controlled), wrapped with field chrome.
 * The single composite value is owned by the field; the presentational
 * ComboboxInput decomposes it across its input/list/chips internally.
 *
 * `import { ComboboxField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<ComboboxFieldProps>(
  bindField<ComboboxFieldProps>(ComboboxInput, "controlled"),
);
