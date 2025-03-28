import type { ExampleControlField } from "../ui/index.js";

export const FONT_CONTROL = ({
  defaultValue = "Arial",
  options = [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Ubuntu", label: "Ubuntu" },
  ],
}: Partial<ExampleControlField>): ExampleControlField => ({
  name: "--font-family",
  label: "Font family",
  inputType: "select",
  defaultValue,
  options,
});

export const FONT_SIZE_CONTROL = ({
  min = 12,
  max = 24,
  step = 1,
  defaultValue = 16,
}: Partial<ExampleControlField>): ExampleControlField => ({
  name: "--font-size",
  inputType: "range",
  label: "Font size",
  defaultValue,
  min,
  max,
  step,
  transformer: (fontSize) => `${fontSize}px`,
});

export const LINE_HEIGHT_CONTROL = ({
  min = 0.5,
  max = 4,
  step = 0.5,
  defaultValue = 1.5,
}: Partial<ExampleControlField>): ExampleControlField => ({
  name: "--line-height",
  inputType: "range",
  label: "Line height",
  defaultValue,
  min,
  max,
  step,
});

/**
 * Returns the default controls.
 * Clones the controls so that examples can have their own state.
 */
const DEFAULT_CONTROLS: () => ExampleControlField[] = () => [
  FONT_CONTROL({}),
  FONT_SIZE_CONTROL({}),
  LINE_HEIGHT_CONTROL({}),
];

export default DEFAULT_CONTROLS;
