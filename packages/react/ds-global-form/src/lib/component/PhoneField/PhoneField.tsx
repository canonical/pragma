import bindField from "#lib/common/bindField/index.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { PhoneInput } from "#lib/subcomponent/PhoneInput/index.js";
import type { PhoneFieldProps } from "./types.js";

/**
 * PhoneInput bound to react-hook-form (controlled), wrapped with field chrome.
 * The single composite value (an E.164 string or a structured object) is owned
 * by the field; the presentational PhoneInput decomposes it into a country + number
 * internally.
 *
 * No static `defaultValue` is passed to `bindField`: the registration default
 * depends on `valueFormat`, which the binding cannot know statically, so the
 * presentational PhoneInput defaults defensively from an undefined initial value.
 */
export default withWrapper<PhoneFieldProps>(
  bindField<PhoneFieldProps>(PhoneInput, "controlled"),
);
