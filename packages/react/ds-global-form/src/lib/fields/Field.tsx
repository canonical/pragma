/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { CheckboxField } from "./Checkbox/index.js";
import { ChoicesField } from "./Choices/index.js";
import { ColorField } from "./Color/index.js";
import { ComboboxField } from "./Combobox/index.js";
import {
  DateInputField,
  DateTimeInputField,
  TimeInputField,
} from "./Date/index.js";
import { DatePickerField } from "./DatePicker/index.js";
import { FileUploadField } from "./FileUpload/index.js";
import { HiddenField } from "./Hidden/index.js";
import { PhoneField } from "./Phone/index.js";
import { RangeField } from "./Range/index.js";
import { SelectField } from "./Select/index.js";
import { SimpleChoicesField } from "./SimpleChoices/index.js";
import { TextField } from "./Text/index.js";
import { TextareaField } from "./Textarea/index.js";
import type { FieldProps } from "./types.js";

/**
 * description of the Field component
 * @returns {React.ReactElement} - Rendered Field
 */
const Field = ({
  inputType,
  CustomComponent,
  ...props
}: FieldProps): React.ReactElement => {
  switch (inputType) {
    case "textarea":
      return <TextareaField {...props} />;
    case "checkbox":
      return <CheckboxField {...props} />;
    case "range":
      return <RangeField {...props} />;
    case "select":
      return <SelectField {...props} />;
    case "simple-choices":
      return <SimpleChoicesField {...props} />;
    case "combobox":
      return <ComboboxField {...props} />;
    case "hidden":
      return <HiddenField {...props} />;
    case "date":
      return <DateInputField {...props} />;
    case "time":
      return <TimeInputField {...props} />;
    case "datetime":
      return <DateTimeInputField {...props} />;
    case "datepicker":
      return <DatePickerField {...props} />;
    case "file":
      return <FileUploadField {...props} />;
    case "color":
      return <ColorField {...props} />;
    case "phone":
      return <PhoneField {...props} />;
    case "choices":
      return <ChoicesField {...props} />;
    case "custom":
      if (!CustomComponent) {
        throw new Error(
          'Field with inputType="custom" requires a CustomComponent prop.',
        );
      }
      return <CustomComponent {...props} />;
    default:
      return <TextField inputType={inputType} {...props} />;
  }
};

export default Field;
