import type { ComponentType, FC } from "react";
import type { BaseInputProps, ToggleWrappedFieldProps } from "../types.js";
import ToggleWrapper from "./ToggleWrapper.js";
import withWrapper from "./withWrapper.js";

/**
 * Field HOC for toggle inputs (checkbox, switch). Like `withWrapper`, but bakes
 * in `ToggleWrapper` (control inline with its label) and types the result to
 * require at least one of `label`/`controlLabel` (see
 * `ToggleWrappedFieldProps`). Applying the label constraint here — in the HOC's
 * return type — keeps it out of the shared `withWrapper` generics, which would
 * otherwise widen the union back to all-optional.
 *
 * `import { withToggleWrapper } from "@canonical/react-ds-global-form";`
 */
const withToggleWrapper = <ComponentProps extends BaseInputProps>(
  Component: ComponentType<ComponentProps>,
): FC<ToggleWrappedFieldProps<ComponentProps>> =>
  withWrapper<ComponentProps>(Component, undefined, ToggleWrapper) as FC<
    ToggleWrappedFieldProps<ComponentProps>
  >;

export default withToggleWrapper;
