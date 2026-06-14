import { Phone } from "../../inputs/Phone/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { PhoneProps } from "./types.js";

/**
 * Phone input bound to react-hook-form (controlled), wrapped with field chrome.
 * The single composite value (an E.164 string or a structured object) is owned
 * by the field; the presentational Phone decomposes it into a country + number
 * internally.
 *
 * No static `defaultValue` is passed to `bindField`: the registration default
 * depends on `valueFormat`, which the binding cannot know statically, so the
 * presentational Phone defaults defensively from an undefined initial value.
 */
export default withWrapper<PhoneProps>(
  bindField<PhoneProps>(Phone, "controlled"),
);
