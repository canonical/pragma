// Internal barrel for the presentational input components (no react-hook-form
// context). Not surfaced at the package root; the field/RHF-bound versions live
// under `fields/`. Choice-style inputs are field-private (folded into their
// fields), so they are not re-exported here.

export type { CheckboxPresentationProps } from "./Checkbox/index.js";
export { Checkbox } from "./Checkbox/index.js";
export type { ColorPresentationProps, HexFormat } from "./Color/index.js";
export { Color } from "./Color/index.js";
export type { ComboboxPresentationProps } from "./Combobox/index.js";
export { Combobox } from "./Combobox/index.js";
export type {
  DateInputPresentationProps,
  DateTimeInputPresentationProps,
  TimeInputPresentationProps,
} from "./Date/index.js";
export { DateInput, DateTimeInput, TimeInput } from "./Date/index.js";
export type { FileUploadPresentationProps } from "./FileUpload/index.js";
export { FileUpload } from "./FileUpload/index.js";
export type { HiddenPresentationProps } from "./Hidden/index.js";
export { Hidden } from "./Hidden/index.js";
export type {
  PhonePresentationProps,
  PhoneValue,
} from "./Phone/index.js";
export { Phone } from "./Phone/index.js";
export type { RangePresentationProps } from "./Range/index.js";
export { Range } from "./Range/index.js";
export type { SelectPresentationProps } from "./Select/index.js";
export { Select } from "./Select/index.js";
export type { TextInputType, TextPresentationProps } from "./Text/index.js";
export { Text } from "./Text/index.js";
export type { TextareaPresentationProps } from "./Textarea/index.js";
export { Textarea } from "./Textarea/index.js";
