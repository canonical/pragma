import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { Combobox } from "../../inputs/Combobox/index.js";
import type { ComboboxProps } from "./types.js";

/**
 * Combobox bound to react-hook-form (controlled), wrapped with field chrome.
 * The single composite value is owned by the field; the presentational
 * Combobox decomposes it across its input/list/chips internally.
 */
export default withWrapper<ComboboxProps>(
  bindField<ComboboxProps>(Combobox, "controlled"),
);
