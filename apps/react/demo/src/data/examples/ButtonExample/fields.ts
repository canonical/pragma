import DEFAULT_CATEGORIES from "data/fields.js";
import type { FieldsSection } from "ui/index.js";

const sections: FieldsSection[] = [
  ...DEFAULT_CATEGORIES,
  {
    title: "Misc",
    fields: [
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
    ],
  },
];

export default sections;
