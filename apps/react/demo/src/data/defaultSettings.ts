import type { ExampleControl } from "../ui/Example/index.js";

export const FONT_CONTROL: ExampleControl = {
  name: "--font-family",
  label: "Font family",
  inputType: "simple-choices",
  value: "Arial",
  default: "Arial",
  options: [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Ubuntu", label: "Ubuntu" },
  ],
};

export const FONT_SIZE_CONTROL: ExampleControl = {
  name: "--font-size",
  inputType: "range",
  label: "Font size",
  value: 16,
  default: 16,
  min: 12,
  max: 24,
  transformer: (fontSize) => `${fontSize}px`,
};

export const LINE_HEIGHT_CONTROL: ExampleControl = {
  name: "--line-height",
  inputType: "range",
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
