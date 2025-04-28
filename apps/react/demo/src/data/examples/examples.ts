import type { ShowcaseExampleOptions } from "../../ui/index.js";
import { ButtonExample, ButtonExampleFields } from "./ButtonExample/index.js";
import {
  TypographicSpecimen,
  TypographicSpecimenFields,
} from "./TypographicSpecimen/index.js";

export const SHOWCASE_EXAMPLES: ShowcaseExampleOptions[] = [
  {
    name: "Typographic Specimen",
    description: "A typographic specimen with configurable font settings.",
    Component: TypographicSpecimen,
    sections: TypographicSpecimenFields,
  },
  {
    name: "Button",
    description: "A button example with font settings.",
    Component: ButtonExample,
    sections: ButtonExampleFields,
  },
];
