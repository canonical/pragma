import DEFAULT_FIELDS from "data/fields.js";
import type { ExampleControlFieldOpts } from "ui/index.js";

const fields: ExampleControlFieldOpts[] = [
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
