import {
  ButtonExample,
  TypographicSpecimen,
} from "../ui/Example/common/index.js";
import type { ShowcaseExampleOpts } from "../ui/Example/index.js";
import DEFAULT_CONTROLS from "./defaultSettings.js";

export const SHOWCASE_EXAMPLES: ShowcaseExampleOpts[] = [
  {
    name: "Typographic Specimen",
    description: "A typographic specimen with configurable font settings",
    Component: TypographicSpecimen,
    controls: DEFAULT_CONTROLS(),
  },
  {
    name: "example1",
    description: "An example with font settings",
    Component: ButtonExample,
    controls: [
      ...DEFAULT_CONTROLS(),
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
