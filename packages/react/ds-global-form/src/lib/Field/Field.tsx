/* @canonical/generator-ds 0.9.0-experimental.4 */
import type React from "react";
import {
  Checkbox,
  Choices,
  Color,
  Combobox,
  DateInput,
  DateTimeInput,
  FileUpload,
  Hidden,
  Phone,
  Range,
  Select,
  SimpleChoices,
  Text,
  Textarea,
  TimeInput,
} from "./inputs/index.js";
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
      return <Textarea {...props} />;
    case "checkbox":
      return <Checkbox {...props} />;
    case "range":
      return <Range {...props} />;
    case "select":
      return <Select {...props} />;
    case "simple-choices":
      return <SimpleChoices {...props} />;
    case "combobox":
      return <Combobox {...props} />;
    case "hidden":
      return <Hidden {...props} />;
    case "date":
      return <DateInput {...props} />;
    case "time":
      return <TimeInput {...props} />;
    case "datetime":
      return <DateTimeInput {...props} />;
    case "file":
      return <FileUpload {...props} />;
    case "color":
      return <Color {...props} />;
    case "phone":
      return <Phone {...props} />;
    case "choices":
      return <Choices {...props} />;
    case "custom":
      if (!CustomComponent) {
        throw new Error(
          'Field with inputType="custom" requires a CustomComponent prop.',
        );
      }
      return <CustomComponent {...props} />;
    default:
      return <Text inputType={inputType} {...props} />;
  }
};

export default Field;
