import type { ShowcaseExample } from "../../ui/index.js";
import { ButtonExample, ButtonExampleFields } from "./ButtonExample/index.js";
import {
  TypographicSpecimen,
  TypographicSpecimenFields,
} from "./TypographicSpecimen/index.js";

export const SHOWCASE_EXAMPLES: ShowcaseExample[] = [
  {
    id: "typographic-specimen",
    label: "Typographic Specimen",
    description: "A typographic specimen with configurable font settings.",
    Component: TypographicSpecimen,
    fields: TypographicSpecimenFields,
  },
  {
    id: "button",
    label: "Button",
    description: "A button example with font settings.",
    Component: ButtonExample,
    fields: ButtonExampleFields,
  },
];
