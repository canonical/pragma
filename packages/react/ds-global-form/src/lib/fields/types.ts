import type { InputProps } from "#lib/common/types.js";
import type { NativeInputType } from "#lib/subcomponent/types.js";
import type { CheckboxProps } from "./Checkbox/index.js";
import type { ChoicesProps } from "./Choices/index.js";
import type { ColorProps } from "./Color/index.js";
import type { ComboboxProps } from "./Combobox/index.js";
import type {
  DateInputProps,
  DateTimeInputProps,
  TimeInputProps,
} from "./Date/index.js";
import type { FileUploadProps } from "./FileUpload/index.js";
import type { HiddenProps } from "./Hidden/index.js";
import type { PhoneProps } from "./Phone/index.js";
import type { RangeProps } from "./Range/index.js";
import type { SelectProps } from "./Select/index.js";
import type { SimpleChoicesProps } from "./SimpleChoices/index.js";
import type { TextProps } from "./Text/index.js";
import type { TextareaProps } from "./Textarea/index.js";

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
// re-exported here so existing field-tier consumers keep importing them from
// `fields/types`.
export type {
  BaseProps,
  NativeInputType,
  Option,
  OptionsProps,
} from "#lib/subcomponent/types.js";

export type FieldProps =
  | ({ inputType: NativeInputType } & TextProps)
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
