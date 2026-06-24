import { Hidden } from "../../inputs/Hidden/index.js";
import bindField from "../common/bindField.js";
import { InvisibleWrapper, withWrapper } from "../common/Wrapper/index.js";
import type { HiddenProps } from "./types.js";

/**
 * Hidden input bound to react-hook-form. Uses InvisibleWrapper so no label,
 * description, or error chrome is rendered.
 */
export default withWrapper<HiddenProps>(
  bindField<HiddenProps>(Hidden, "native"),
  {},
  InvisibleWrapper,
);
