import type { ShowcaseExampleOpts } from "../../ui/index.js";
import { ButtonExample, ButtonExampleFields } from "./ButtonExample/index.js";
import {
  TypographicSpecimen,
  TypographicSpecimenFields,
} from "./TypographicSpecimen/index.js";

export const SHOWCASE_EXAMPLES: ShowcaseExampleOpts[] = [
  {
    name: "Typographic Specimen",
    description: "A typographic specimen with configurable font settings.",
    Component: TypographicSpecimen,
    fields: TypographicSpecimenFields,
  },
  {
    name: "Button",
    description: "A button example with font settings.",
    Component: ButtonExample,
    fields: ButtonExampleFields,
  },
];
