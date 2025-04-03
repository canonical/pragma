/** Global field settings for commonly-used fields. */

import type { ExampleControlField } from "../ui/index.js";

export const FONT_FAMILY_FIELD: ExampleControlField = {
  name: "--font-family",
  label: "Font family",
  inputType: "select",
  defaultValue: "Arial",
  options: [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Ubuntu variable", label: "Ubuntu" },
  ],
};

export const FONT_SIZE_FIELD: ExampleControlField = {
  name: "--font-size",
  inputType: "range",
  label: "Root font size",
  defaultValue: 16,
  min: 12,
  max: 24,
  step: 1,
  transformer: (fontSize) => `${fontSize}px`,
};

export const LINE_HEIGHT_FIELD: ExampleControlField = {
  name: "--line-height",
  inputType: "range",
  label: "Root line height",
  defaultValue: 1.5,
  min: 0.125,
  max: 12,
  step: 0.125,
  transformer: (lineHeight) => `${lineHeight}rem`,
};

const DEFAULT_FIELDS: ExampleControlField[] = [
  FONT_FAMILY_FIELD,
  FONT_SIZE_FIELD,
  LINE_HEIGHT_FIELD,
];

export default DEFAULT_FIELDS;
