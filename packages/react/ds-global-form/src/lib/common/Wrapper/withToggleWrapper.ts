import type { ComponentType, FC } from "react";
import type {
  BaseInputProps,
  ToggleLabelProps,
  WrapperProps,
} from "../types.js";
import ToggleWrapper from "./ToggleWrapper.js";
import withWrapper from "./withWrapper.js";

/**
 * Public props of a toggle field: everything the wrapper accepts, but with the
 * optional `label`/`controlLabel` replaced by the "at least one" union so a
 * label-less toggle is a compile error.
 */
type ToggleWrapperProps<ComponentProps extends BaseInputProps> = Omit<
  WrapperProps<ComponentProps>,
  "Component" | "label" | "controlLabel"
> &
  ToggleLabelProps;

/**
 * Field HOC for toggle inputs (checkbox, switch). Like `withWrapper`, but bakes
 * in `ToggleWrapper` (control inline with its label) and types the result to
 * require at least one of `label`/`controlLabel`. Applying the label constraint
 * here — in the HOC's return type — keeps it out of the shared `withWrapper`
 * generics, which would otherwise widen the union back to all-optional.
 *
 * `import { withToggleWrapper } from "@canonical/react-ds-global-form";`
 */
const withToggleWrapper = <ComponentProps extends BaseInputProps>(
  Component: ComponentType<ComponentProps>,
): FC<ToggleWrapperProps<ComponentProps>> =>
  withWrapper<ComponentProps>(Component, undefined, ToggleWrapper) as FC<
    ToggleWrapperProps<ComponentProps>
  >;

export default withToggleWrapper;
