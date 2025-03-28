import type { ExampleControl, ExampleSetting } from "../ui/Example/index.js";

export const FONT_CONTROL: (props: Partial<ExampleSetting>) => ExampleControl =
  ({
    defaultValue = "Arial",
    options = [
      { value: "Arial", label: "Arial" },
      { value: "Times New Roman", label: "Times New Roman" },
      { value: "Ubuntu", label: "Ubuntu" },
    ],
  }) => ({
    name: "--font-family",
    label: "Font family",
    inputType: "select",
    defaultValue,
    options,
  });

export const FONT_SIZE_CONTROL: (
  props: Partial<ExampleSetting<number>>,
) => ExampleControl = ({
  min = 12,
  max = 24,
  step = 1,
  defaultValue = 16,
}) => ({
  name: "--font-size",
  inputType: "range",
  label: "Font size",
  defaultValue,
  min,
  max,
  step,
  transformer: (fontSize) => `${fontSize}px`,
});

export const LINE_HEIGHT_CONTROL: (
  props: Partial<ExampleSetting<number>>,
) => ExampleControl = ({
  min = 0.5,
  max = 4,
  step = 0.5,
  defaultValue = 1.5,
}) => ({
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
const DEFAULT_CONTROLS: () => ExampleControl[] = () => [
  FONT_CONTROL({}),
  FONT_SIZE_CONTROL({}),
  LINE_HEIGHT_CONTROL({}),
];

export default DEFAULT_CONTROLS;
