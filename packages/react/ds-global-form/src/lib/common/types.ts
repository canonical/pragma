import type React from "react";
import type { RegisterOptions } from "react-hook-form";
import type { BaseProps } from "#lib/subcomponent/types.js";

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

export type BaseWrapperProps<ComponentProps> = BaseProps & {
  /* The input to render */
  Component: React.ComponentType<ComponentProps>;
};

export type WrapperProps<ComponentProps> = BaseWrapperProps<ComponentProps> & {
  /* The description of the input. Will be a child of p.ds.field-description */
  description?: string;

  /* The name of input labelled */
  label?: string;

  /* Is the field optional */
  isOptional?: boolean;

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
