/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import { CheckboxField } from "../../component/CheckboxField/index.js";
import { ChoicesField } from "../../component/ChoicesField/index.js";
import { ColorField } from "../../component/ColorField/index.js";
import { ComboboxField } from "../../component/ComboboxField/index.js";
import { DateField } from "../../component/DateField/index.js";
import { DateTimeField } from "../../component/DateTimeField/index.js";
import { FileUploadField } from "../../component/FileUploadField/index.js";
import { HiddenField } from "../../component/HiddenField/index.js";
import { NumberField } from "../../component/NumberField/index.js";
import { PasswordField } from "../../component/PasswordField/index.js";
import { PhoneField } from "../../component/PhoneField/index.js";
import { RangeField } from "../../component/RangeField/index.js";
import { RatingField } from "../../component/RatingField/index.js";
import { RichChoicesField } from "../../component/RichChoicesField/index.js";
import { SelectField } from "../../component/SelectField/index.js";
import { SwitchField } from "../../component/SwitchField/index.js";
import { TextareaField } from "../../component/TextareaField/index.js";
import { TextField } from "../../component/TextField/index.js";
import { TimeField } from "../../component/TimeField/index.js";
import type { FieldProps } from "./types.js";

/**
 * description of the Field component
 * @returns {React.ReactElement} - Rendered Field
 *
 * `import { Field } from "@canonical/react-ds-global-form";`
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
    case "switch":
      return <SwitchField {...props} />;
    case "rating":
      return <RatingField {...props} />;
    case "range":
      return <RangeField {...props} />;
    case "select":
      return <SelectField {...props} />;
    case "choices":
      return <ChoicesField {...props} />;
    case "combobox":
      return <ComboboxField {...props} />;
    case "hidden":
      return <HiddenField {...props} />;
    case "date":
      return <DateField {...props} />;
    case "time":
      return <TimeField {...props} />;
    case "datetime":
      return <DateTimeField {...props} />;
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
    case "rich-choices":
      return <RichChoicesField {...props} />;
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
