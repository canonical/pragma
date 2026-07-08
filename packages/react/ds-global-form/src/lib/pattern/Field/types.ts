import type { InputProps } from "../../common/types.js";
import type { CheckboxFieldProps } from "../../component/CheckboxField/index.js";
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
import type { SwitchFieldProps } from "../../component/SwitchField/index.js";
import type { TextareaFieldProps } from "../../component/TextareaField/index.js";
import type { TextFieldProps } from "../../component/TextField/index.js";
import type { TimeFieldProps } from "../../component/TimeField/index.js";
import type { NativeInputType } from "../../subcomponent/types.js";

export type {
  BaseInputProps,
  BaseWrapperProps,
  Condition,
  InputProps,
  Middleware,
  WrappedComponentProps,
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

export type FieldProps =
  | ({
      inputType: Exclude<NativeInputType, "password" | "number">;
    } & TextFieldProps)
  | ({ inputType: "password" } & PasswordFieldProps)
  | ({ inputType: "number" } & NumberFieldProps)
  | ({ inputType: "checkbox" } & CheckboxFieldProps)
  | ({ inputType: "switch" } & SwitchFieldProps)
  | ({ inputType: "hidden" } & HiddenFieldProps)
  | ({ inputType: "range" } & RangeFieldProps)
  | ({ inputType: "rating" } & RatingFieldProps)
  | ({ inputType: "select" } & SelectFieldProps)
  | ({ inputType: "combobox" } & ComboboxFieldProps)
  | ({ inputType: "choices" } & ChoicesFieldProps)
  | ({ inputType: "textarea" } & TextareaFieldProps)
  | ({ inputType: "date" } & DateFieldProps)
  | ({ inputType: "time" } & TimeFieldProps)
  | ({ inputType: "datetime" } & DateTimeFieldProps)
  | ({ inputType: "file" } & FileUploadFieldProps)
  | ({ inputType: "color" } & ColorFieldProps)
  | ({ inputType: "phone" } & PhoneFieldProps)
  | ({ inputType: "rich-choices" } & RichChoicesFieldProps)
  | ({
      inputType: "custom";
      // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
      CustomComponent: React.ComponentType<InputProps<any>>;
      // biome-ignore lint/suspicious/noExplicitAny: In the case of a custom component, we'd expect
    } & InputProps<any>);
