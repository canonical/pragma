import type {
  InputProps,
  ToggleWrappedFieldProps,
  WrappedFieldProps,
} from "../../common/types.js";
import type { ChoicesFieldProps } from "../../component/ChoicesField/index.js";
import type { ColorFieldProps } from "../../component/ColorField/index.js";
import type { ComboboxFieldProps } from "../../component/ComboboxField/index.js";
import type { DateFieldProps } from "../../component/DateField/index.js";
import type { DateTimeFieldProps } from "../../component/DateTimeField/index.js";
import type { FileUploadFieldProps } from "../../component/FileUploadField/index.js";
import type { HiddenFieldProps } from "../../component/HiddenField/index.js";
import type { NumberFieldProps } from "../../component/NumberField/index.js";
import type { PasswordFieldProps } from "../../component/PasswordField/index.js";
import type { PhoneFieldProps } from "../../component/PhoneField/index.js";
import type { RangeFieldProps } from "../../component/RangeField/index.js";
import type { RatingFieldProps } from "../../component/RatingField/index.js";
import type { RichChoicesFieldProps } from "../../component/RichChoicesField/index.js";
import type { SelectFieldProps } from "../../component/SelectField/index.js";
import type { TextareaFieldProps } from "../../component/TextareaField/index.js";
import type { TextFieldProps } from "../../component/TextField/index.js";
import type { TimeFieldProps } from "../../component/TimeField/index.js";
import type { CheckboxInputProps } from "../../subcomponent/CheckboxInput/index.js";
import type { SwitchInputProps } from "../../subcomponent/SwitchInput/index.js";
import type { NativeInputType } from "../../subcomponent/types.js";

export type {
  BaseInputProps,
  BaseWrapperProps,
  Condition,
  InputProps,
  Middleware,
  ToggleWrappedFieldProps,
  WrappedComponentProps,
  WrappedFieldProps,
  WrapperHOCAdditionalProps,
  WrapperProps,
} from "../../common/types.js";
// Shared presentational types live in `subcomponent/types.ts`; the
// field-composition machinery types live in `common/types.ts`. Both are
// re-exported here (the Field pattern's type module) so consumers can import
// them alongside `FieldProps`.
export type {
  BaseProps,
  NativeInputType,
  Option,
  OptionsProps,
} from "../../subcomponent/types.js";

/**
 * Props of the `Field` router, as a discriminated union on `inputType`: each
 * variant is exactly what the dispatched `*Field` component accepts — the
 * input's own props plus the wrapper chrome (`label`, `description`,
 * `isOptional`, …) and the HOC extras (`middleware`, `WrapperComponent`,
 * `condition`) — plus the discriminant (see `WrappedFieldProps` /
 * `ToggleWrappedFieldProps`). Narrowing on `inputType` therefore yields the
 * full prop surface of that field.
 *
 * The `custom` variant is the exception: `Field` renders the supplied
 * `CustomComponent` directly (no wrapper chrome is applied by `Field` itself),
 * forwarding `name`, the registration props and any extra props as-is — so a
 * custom component opts into label/description/error chrome by applying
 * `withWrapper` internally.
 */
export type FieldProps =
  | ({
      inputType: Exclude<NativeInputType, "password" | "number">;
    } & WrappedFieldProps<TextFieldProps>)
  | ({ inputType: "password" } & WrappedFieldProps<PasswordFieldProps>)
  | ({ inputType: "number" } & WrappedFieldProps<NumberFieldProps>)
  | ({
      inputType: "checkbox";
    } & ToggleWrappedFieldProps<InputProps<CheckboxInputProps>>)
  | ({
      inputType: "switch";
    } & ToggleWrappedFieldProps<InputProps<SwitchInputProps>>)
  | ({ inputType: "hidden" } & WrappedFieldProps<HiddenFieldProps>)
  | ({ inputType: "range" } & WrappedFieldProps<RangeFieldProps>)
  | ({ inputType: "rating" } & WrappedFieldProps<RatingFieldProps>)
  | ({ inputType: "select" } & WrappedFieldProps<SelectFieldProps>)
  | ({ inputType: "combobox" } & WrappedFieldProps<ComboboxFieldProps>)
  | ({ inputType: "choices" } & WrappedFieldProps<ChoicesFieldProps>)
  | ({ inputType: "textarea" } & WrappedFieldProps<TextareaFieldProps>)
  | ({ inputType: "date" } & WrappedFieldProps<DateFieldProps>)
  | ({ inputType: "time" } & WrappedFieldProps<TimeFieldProps>)
  | ({ inputType: "datetime" } & WrappedFieldProps<DateTimeFieldProps>)
  | ({ inputType: "file" } & WrappedFieldProps<FileUploadFieldProps>)
  | ({ inputType: "color" } & WrappedFieldProps<ColorFieldProps>)
  | ({ inputType: "phone" } & WrappedFieldProps<PhoneFieldProps>)
  | ({ inputType: "rich-choices" } & WrappedFieldProps<RichChoicesFieldProps>)
  | ({
      inputType: "custom";
      /**
       * The input to render. It must accept the base `InputProps` (`name`,
       * `registerProps` and the aria props); `Field` renders it directly with
       * every remaining prop, so any extra props passed to `Field` are
       * forwarded to it as-is.
       */
      CustomComponent: React.ComponentType<InputProps>;
    } & InputProps<Record<string, unknown>>);
