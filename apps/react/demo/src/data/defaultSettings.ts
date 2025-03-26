import type { ExampleControl } from "../ui/Example/index.js";

export const FONT_CONTROL: ExampleControl = {
  name: "fontFamily",
  label: "Font family",
  type: "choices",
  value: "Arial",
  default: "Arial",
  choices: ["Arial", "Helvetica", "Times New Roman"],
};

export const FONT_SIZE_CONTROL: ExampleControl = {
  name: "fontSize",
  type: "number",
  label: "Font size",
  value: 16,
  default: 16,
  min: 12,
  max: 24,
  transformer: (fontSize) => `${fontSize}px`,
};

export const LINE_HEIGHT_CONTROL: ExampleControl = {
  name: "lineHeight",
  type: "number",
  label: "Line height",
  value: 1.5,
  default: 1.5,
  min: 0.5,
  max: 4,
  step: 0.5,
};

const DEFAULT_CONTROLS: ExampleControl[] = [
  FONT_CONTROL,
  FONT_SIZE_CONTROL,
  LINE_HEIGHT_CONTROL,
];

export default DEFAULT_CONTROLS;
