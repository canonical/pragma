import type { RegisterOptions } from "react-hook-form";
import type {
  BaseProps,
  Option,
  OptionsProps,
  TODONativeInputTypes,
} from "../inputs/types.js";
import type { CheckboxProps } from "./Checkbox/index.js";
import type { ComboboxProps } from "./Combobox/index.js";
import type {
  DateInputProps,
  DateTimeInputProps,
  TimeInputProps,
} from "./Date/index.js";
import type { HiddenProps } from "./Hidden/index.js";
import type {
  ChoicesProps,
  ColorProps,
  FileUploadProps,
  PhoneProps,
  SimpleChoicesProps,
} from "./inputs/index.js";
import type { RangeProps } from "./Range/index.js";
import type { SelectProps } from "./Select/index.js";
import type { TextProps } from "./Text/index.js";
import type { TextareaProps } from "./Textarea/index.js";

// Shared presentational types live in `../inputs/types.ts`; re-export them so
// existing field-tier consumers keep importing them from here.
export type { BaseProps, Option, OptionsProps, TODONativeInputTypes };

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

export type FieldProps =
  | ({ inputType: TODONativeInputTypes } & TextProps)
  | ({ inputType: "checkbox" } & CheckboxProps)
  | ({ inputType: "hidden" } & HiddenProps)
  | ({ inputType: "range" } & RangeProps)
  | ({ inputType: "select" } & SelectProps)
  | ({ inputType: "combobox" } & ComboboxProps)
  | ({ inputType: "simple-choices" } & SimpleChoicesProps)
  | ({ inputType: "textarea" } & TextareaProps)
  | ({ inputType: "date" } & DateInputProps)
  | ({ inputType: "time" } & TimeInputProps)
  | ({ inputType: "datetime" } & DateTimeInputProps)
  | ({ inputType: "file" } & FileUploadProps)
  | ({ inputType: "color" } & ColorProps)
  | ({ inputType: "phone" } & PhoneProps)
  | ({ inputType: "choices" } & ChoicesProps)
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
