/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { CheckboxField } from "#lib/component/CheckboxField/index.js";
import { ChoicesField } from "#lib/component/ChoicesField/index.js";
import { ColorField } from "#lib/component/ColorField/index.js";
import { ComboboxField } from "#lib/component/ComboboxField/index.js";
import { DateInputField } from "#lib/component/DateInputField/index.js";
import { DateTimeInputField } from "#lib/component/DateTimeInputField/index.js";
import { FileUploadField } from "#lib/component/FileUploadField/index.js";
import { HiddenField } from "#lib/component/HiddenField/index.js";
import { NumberField } from "#lib/component/NumberField/index.js";
import { PasswordField } from "#lib/component/PasswordField/index.js";
import { PhoneField } from "#lib/component/PhoneField/index.js";
import { RangeField } from "#lib/component/RangeField/index.js";
import { SelectField } from "#lib/component/SelectField/index.js";
import { SimpleChoicesField } from "#lib/component/SimpleChoicesField/index.js";
import { TextareaField } from "#lib/component/TextareaField/index.js";
import { TextField } from "#lib/component/TextField/index.js";
import { TimeInputField } from "#lib/component/TimeInputField/index.js";
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
    case "file":
      return <FileUploadField {...props} />;
    case "color":
      return <ColorField {...props} />;
    case "phone":
      return <PhoneField {...props} />;
    case "password":
      return <PasswordField {...props} />;
    case "number":
      return <NumberField {...props} />;
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
