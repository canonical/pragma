import type { ComponentProps } from "react";
import type { RegisterOptions } from "react-hook-form";
import type {
  CheckboxProps,
  RangeProps,
  SelectProps,
  SimpleChoicesProps,
  TextareaProps,
  TextProps,
} from "./inputs/index.js";

export type BaseProps = {
  id?: string;
  className?: string;
  style?: React.CSSProperties;
};

export type BaseInputProps = BaseProps & {
  name: string;
  registerProps?: RegisterOptions;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: boolean;
};

export type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type OptionsProps = {
  options: Option[];
};

/** Represents the input types that are commonly associated with a text input */
export type TODONativeInputTypes =
  | "text"
  | "password"
  | "email"
  | "number"
  | "tel"
  | "url";

export type InputProps<
  // biome-ignore lint/complexity/noBannedTypes: Inputs might in some cases not add props to the base set
  // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
  AdditionalComponentProps extends Record<string, any> = {},
> = BaseInputProps & AdditionalComponentProps;

export type TODOUnion = CheckboxProps | TextProps;

export type FieldProps =
  | ({ inputType: TODONativeInputTypes } & TextProps)
  | ({ inputType: "checkbox" } & CheckboxProps)
  | ({ inputType: "range" } & RangeProps)
  | ({ inputType: "select" } & SelectProps)
  | ({ inputType: "simple-choices" } & SimpleChoicesProps)
  | ({ inputType: "textarea" } & TextareaProps)
  | ({
      inputType: "custom";
      // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
      CustomComponent: React.ComponentType<InputProps<any>>;
      // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
    } & InputProps<any>);

export type BaseWrapperProps<ComponentProps> = BaseProps & {
  /* The input to render */
  Component: React.ComponentType<ComponentProps>;
};

export type WrapperProps<ComponentProps> = BaseWrapperProps<ComponentProps> & {
  /* The description of the input. Will be a children of p.form-field-description */
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
