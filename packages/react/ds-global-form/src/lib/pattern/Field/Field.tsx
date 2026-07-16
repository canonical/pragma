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
// Each branch destructures `inputType` (and, for "custom", `CustomComponent`)
// out of the already-narrowed props, so the spread it forwards is exactly the
// dispatched component's own prop surface. Destructuring before the switch
// would break the discriminated-union narrowing on the rest object.
const Field = (props: FieldProps): React.ReactElement => {
  switch (props.inputType) {
    case "textarea": {
      const { inputType, ...rest } = props;
      return <TextareaField {...rest} />;
    }
    case "checkbox": {
      const { inputType, ...rest } = props;
      return <CheckboxField {...rest} />;
    }
    case "switch": {
      const { inputType, ...rest } = props;
      return <SwitchField {...rest} />;
    }
    case "rating": {
      const { inputType, ...rest } = props;
      return <RatingField {...rest} />;
    }
    case "range": {
      const { inputType, ...rest } = props;
      return <RangeField {...rest} />;
    }
    case "select": {
      const { inputType, ...rest } = props;
      return <SelectField {...rest} />;
    }
    case "choices": {
      const { inputType, ...rest } = props;
      return <ChoicesField {...rest} />;
    }
    case "combobox": {
      const { inputType, ...rest } = props;
      return <ComboboxField {...rest} />;
    }
    case "hidden": {
      const { inputType, ...rest } = props;
      return <HiddenField {...rest} />;
    }
    case "date": {
      const { inputType, ...rest } = props;
      return <DateField {...rest} />;
    }
    case "time": {
      const { inputType, ...rest } = props;
      return <TimeField {...rest} />;
    }
    case "datetime": {
      const { inputType, ...rest } = props;
      return <DateTimeField {...rest} />;
    }
    case "file": {
      const { inputType, ...rest } = props;
      return <FileUploadField {...rest} />;
    }
    case "color": {
      const { inputType, ...rest } = props;
      return <ColorField {...rest} />;
    }
    case "phone": {
      const { inputType, ...rest } = props;
      return <PhoneField {...rest} />;
    }
    case "password": {
      const { inputType, ...rest } = props;
      return <PasswordField {...rest} />;
    }
    case "number": {
      const { inputType, ...rest } = props;
      return <NumberField {...rest} />;
    }
    case "rich-choices": {
      const { inputType, ...rest } = props;
      return <RichChoicesField {...rest} />;
    }
    case "custom": {
      const { inputType, CustomComponent, ...rest } = props;
      if (!CustomComponent) {
        throw new Error(
          'Field with inputType="custom" requires a CustomComponent prop.',
        );
      }
      return <CustomComponent {...rest} />;
    }
    default:
      // Text-like native types ("text" | "email" | "tel" | "url"): TextField
      // consumes `inputType` itself, so the discriminant stays in the spread.
      return <TextField {...props} />;
  }
};

export default Field;
