import DEFAULT_CATEGORIES from "data/fields.js";
import type { FieldCategory } from "ui/index.js";

const fieldCategories: FieldCategory[] = [
  ...DEFAULT_CATEGORIES,
  {
    label: "Misc",
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

export default fieldCategories;
