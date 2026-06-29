import type { InputProps } from "#lib/common/types.js";
import type { CheckboxFieldProps } from "#lib/component/CheckboxField/index.js";
import type { ChoicesFieldProps } from "#lib/component/ChoicesField/index.js";
import type { ColorFieldProps } from "#lib/component/ColorField/index.js";
import type { ComboboxFieldProps } from "#lib/component/ComboboxField/index.js";
import type { DateInputFieldProps } from "#lib/component/DateInputField/index.js";
import type { DateTimeInputFieldProps } from "#lib/component/DateTimeInputField/index.js";
import type { FileUploadFieldProps } from "#lib/component/FileUploadField/index.js";
import type { HiddenFieldProps } from "#lib/component/HiddenField/index.js";
import type { NumberFieldProps } from "#lib/component/NumberField/index.js";
import type { PasswordFieldProps } from "#lib/component/PasswordField/index.js";
import type { PhoneFieldProps } from "#lib/component/PhoneField/index.js";
import type { RangeFieldProps } from "#lib/component/RangeField/index.js";
import type { SelectFieldProps } from "#lib/component/SelectField/index.js";
import type { SimpleChoicesFieldProps } from "#lib/component/SimpleChoicesField/index.js";
import type { TextareaFieldProps } from "#lib/component/TextareaField/index.js";
import type { TextFieldProps } from "#lib/component/TextField/index.js";
import type { TimeInputFieldProps } from "#lib/component/TimeInputField/index.js";
import type { NativeInputType } from "#lib/subcomponent/types.js";

export type {
  BaseInputProps,
  BaseWrapperProps,
  Condition,
  InputProps,
  Middleware,
  WrappedComponentProps,
  WrapperHOCAdditionalProps,
  WrapperProps,
} from "#lib/common/types.js";
// Shared presentational types live in `subcomponent/types.ts`; the
// field-composition machinery types live in `common/types.ts`. Both are
// re-exported here (the Field pattern's type module) so consumers can import
// them alongside `FieldProps`.
export type {
  BaseProps,
  NativeInputType,
  Option,
  OptionsProps,
} from "#lib/subcomponent/types.js";

export type FieldProps =
  | ({
      inputType: Exclude<NativeInputType, "password" | "number">;
    } & TextFieldProps)
  | ({ inputType: "password" } & PasswordFieldProps)
  | ({ inputType: "number" } & NumberFieldProps)
  | ({ inputType: "checkbox" } & CheckboxFieldProps)
  | ({ inputType: "hidden" } & HiddenFieldProps)
  | ({ inputType: "range" } & RangeFieldProps)
  | ({ inputType: "select" } & SelectFieldProps)
  | ({ inputType: "combobox" } & ComboboxFieldProps)
  | ({ inputType: "simple-choices" } & SimpleChoicesFieldProps)
  | ({ inputType: "textarea" } & TextareaFieldProps)
  | ({ inputType: "date" } & DateInputFieldProps)
  | ({ inputType: "time" } & TimeInputFieldProps)
  | ({ inputType: "datetime" } & DateTimeInputFieldProps)
  | ({ inputType: "file" } & FileUploadFieldProps)
  | ({ inputType: "color" } & ColorFieldProps)
  | ({ inputType: "phone" } & PhoneFieldProps)
  | ({ inputType: "choices" } & ChoicesFieldProps)
  | ({
      inputType: "custom";
      // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
      CustomComponent: React.ComponentType<InputProps<any>>;
      // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
    } & InputProps<any>);
