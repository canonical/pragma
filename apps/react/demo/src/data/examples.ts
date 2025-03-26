import { Button, TypographicSpecimen } from "../ui/Example/common/index.js";
import type { ShowcaseExample } from "../ui/Example/index.js";

export const SHOWCASE_EXAMPLES: ShowcaseExample[] = [
  {
    name: "Typographic Specimen",
    description: "A typographic specimen with configurable font settings",
    Component: TypographicSpecimen,
    settings: {
      fontFamily: {
        value: "Arial",
        default: "Arial",
        choices: ["Arial", "Helvetica", "Times New Roman"],
      },
      fontSize: {
        value: 16,
        default: 16,
        min: 12,
        max: 24,
        cssUnit: "px",
      },
      lineHeight: {
        value: 1.5,
        default: 1.5,
        min: 0.5,
        max: 4,
        step: 0.5,
      },
    },
  },
  {
    name: "example1",
    description: "An example with font settings",
    Component: Button,
    settings: {
      fontFamily: {
        value: "Arial",
        default: "Arial",
        choices: ["Arial", "Helvetica", "Times New Roman"],
      },
      fontSize: {
        value: 16,
        default: 16,
        min: 12,
        max: 24,
        cssUnit: "px",
      },
      lineHeight: {
        value: 1.5,
        default: 1.5,
        min: 0.5,
        max: 4,
        step: 0.5,
      },
    },
  },
];
