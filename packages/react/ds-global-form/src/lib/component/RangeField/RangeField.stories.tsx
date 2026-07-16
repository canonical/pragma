import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import { RangeField } from "./index.js";

const meta = {
  title: "components/RangeField",
  component: RangeField,
  tags: ["autodocs"],
  decorators: [decorators.form({ defaultValues: { volume: 50 } })],
} satisfies Meta<typeof RangeField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "volume", label: "Volume", min: 0, max: 100 },
};

export const Stepped: Story = {
  args: { name: "volume", label: "Volume", min: 0, max: 100, step: 10 },
};

export const CustomSliderLabel: Story = {
  args: {
    name: "volume",
    label: "Volume",
    min: 0,
    max: 100,
    sliderLabel: "Volume (slider)",
  },
};

/** Error state: touched + failing validation → the field shows `.danger` chrome + the error message. */
export const WithError = errorStory({
  name: "err_range",
  label: "Volume",
  extraArgs: { min: 0, max: 100 },
});
