import DEFAULT_FIELDS from "data/fields.js";
import type { ExampleControlField } from "ui/index.js";

const fields: ExampleControlField[] = [
  ...DEFAULT_FIELDS,
  {
    name: "numButtons",
    label: "Number of buttons",
    inputType: "range",
    min: 1,
    max: 5,
    defaultValue: 1,
    disabledOutputFormats: {
      css: true,
    },
  },
];

export default fields;
