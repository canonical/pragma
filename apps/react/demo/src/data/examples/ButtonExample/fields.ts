import * as fields from "data/fields.js";
import type { FormSection } from "../../../ui/index.js";

const sections: FormSection[] = [
  {
    title: "Root",
    fields: [
      fields.FONT_FAMILY_FIELD,
      fields.FONT_SIZE_FIELD,
      fields.BASELINE_HEIGHT_FIELD,
      fields.LINE_HEIGHT_FIELD,
    ],
  },
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
