import type React from "react";
import type { RegisterOptions } from "react-hook-form";
import type { RequiredIndicator } from "../subcomponent/Field/Label/types.js";
import type { BaseProps } from "../subcomponent/types.js";

// Field-composition machinery types, shared by `Wrapper` and `bindField` and by
// every `*Field` component. Kept in `common/` (not a tier) so any tier may
// depend on them downward. The `FieldProps` aggregator union (which depends on
// every concrete field) stays with the Field pattern, not here.

export type BaseInputProps = BaseProps & {
  name: string;
  registerProps?: RegisterOptions;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: boolean;
};

export type InputProps<
  // biome-ignore lint/complexity/noBannedTypes: Inputs might in some cases not add props to the base set
  // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
  AdditionalComponentProps extends Record<string, any> = {},
> = BaseInputProps & AdditionalComponentProps;

/**
 * At least one of `label`/`controlLabel` — the toggle-field label requirement,
 * expressed as a union so a label-less toggle is a compile error rather than a
 * runtime check.
 */
export type ToggleLabelProps =
  | { label: string; controlLabel?: string }
  | { label?: string; controlLabel: string };

/**
 * Props for toggle fields (checkbox, switch), which render the control inline
 * with its label via the ToggleWrapper. On top of the usual input props they
 * add `controlLabel` (the inline label beside the control) and require at least
 * one of `label`/`controlLabel`. `label` alone is the inline label (the
 * field-map case); `label` + `controlLabel` renders `label` as a heading above
 * and `controlLabel` inline.
 */
export type ToggleFieldProps<
  // biome-ignore lint/complexity/noBannedTypes: toggle inputs may add no extra props
  // biome-ignore lint/suspicious/noExplicitAny: presentational prop shapes vary
  AdditionalComponentProps extends Record<string, any> = {},
> = InputProps<AdditionalComponentProps> & ToggleLabelProps;

export type BaseWrapperProps<ComponentProps> = BaseProps & {
  /* The input to render */
  Component: React.ComponentType<ComponentProps>;
};

export type WrapperProps<ComponentProps> = BaseWrapperProps<ComponentProps> & {
  /* The description of the input. Will be a child of p.ds.field-description */
  description?: string;

  /* The name of input labelled */
  label?: string;

  /* Toggle fields (checkbox, switch) only: the inline label rendered beside the
   * control, which carries the real `htmlFor` binding. When omitted it falls
   * back to `label`; when both are set, `label` becomes the heading above and
   * `controlLabel` the inline control label. */
  controlLabel?: string;

  /* Is the field optional */
  isOptional?: boolean;

  /* Which convention marks required/optional fields in the label. Default:
   * "required" (a "*" marker before the label of required fields). */
  requiredIndicator?: RequiredIndicator;

  /* TODO */
  nestedRegisterProps?: RegisterOptions;

  /* Whether to unregister the field on unmount */
  unregisterOnUnmount?: boolean;

  /* Whether to mock the label */
  mockLabel?: boolean;
} & ComponentProps;

export type Middleware<ComponentProps> = (
  Component: React.ComponentType<ComponentProps>,
) => React.ComponentType<ComponentProps>;

export type Condition = [string[], (depsValues: unknown[]) => boolean];

export type WrapperHOCAdditionalProps<
  ComponentProps extends BaseInputProps,
  ComponentWrapperProps extends
    BaseWrapperProps<ComponentProps> = WrapperProps<ComponentProps>,
> = {
  /**
   * middleware to apply to the input
   **/
  middleware?: Middleware<ComponentProps>[];

  /**
   * An optional wrapper component to render around the input.
   */
  WrapperComponent?: React.ComponentType<ComponentWrapperProps>;

  /**
   * A condition to determine whether to render the component or not.
   */
  condition?: Condition;
};

export type WrappedComponentProps<
  ComponentProps extends BaseInputProps,
  ComponentWrapperProps extends
    BaseWrapperProps<ComponentProps> = WrapperProps<ComponentProps>,
> = ComponentWrapperProps &
  WrapperHOCAdditionalProps<ComponentProps, ComponentWrapperProps>;

/**
 * The full public prop surface of a field component produced by `withWrapper`:
 * the wrapped input's own props plus the wrapper chrome (`label`,
 * `description`, `isOptional`, `requiredIndicator`, …) and the HOC extras
 * (`middleware`, `WrapperComponent`, `condition`). Only the HOC-supplied
 * `Component` is excluded. This is what `<XxxField {...props} />` accepts, and
 * what each `FieldProps` variant is built from.
 */
export type WrappedFieldProps<
  ComponentProps extends BaseInputProps,
  ComponentWrapperProps extends
    BaseWrapperProps<ComponentProps> = WrapperProps<ComponentProps>,
> = Omit<
  WrappedComponentProps<ComponentProps, ComponentWrapperProps>,
  "Component"
>;

/**
 * Public props of a toggle field (checkbox, switch) produced by
 * `withToggleWrapper`: everything `WrappedFieldProps` accepts, but with the
 * optional `label`/`controlLabel` replaced by the "at least one" union so a
 * label-less toggle is a compile error rather than a runtime check.
 */
export type ToggleWrappedFieldProps<ComponentProps extends BaseInputProps> =
  Omit<WrappedFieldProps<ComponentProps>, "label" | "controlLabel"> &
    ToggleLabelProps;
