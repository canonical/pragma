import type { ExampleControlField } from "../ui/index.js";

export const FONT_CONTROL: ExampleControlField = {
  name: "--font-family",
  label: "Font family",
  inputType: "select",
  defaultValue: "Arial",
  options: [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Ubuntu", label: "Ubuntu" },
  ],
};

export const FONT_SIZE_CONTROL: ExampleControlField = {
  name: "--font-size",
  inputType: "range",
  label: "Font size",
  defaultValue: 16,
  min: 12,
  max: 24,
  step: 1,
  transformer: (fontSize) => `${fontSize}px`,
};

export const LINE_HEIGHT_CONTROL: ExampleControlField = {
  name: "--line-height",
  inputType: "range",
  label: "Line height",
  defaultValue: 1.5,
  min: 0.5,
  max: 4,
  step: 0.5,
};

/**
 * Returns the default controls.
 * Clones the controls so that examples can have their own state.
 */
const DEFAULT_CONTROLS: ExampleControlField[] = [
  FONT_CONTROL,
  FONT_SIZE_CONTROL,
  LINE_HEIGHT_CONTROL,
];

export default DEFAULT_CONTROLS;
