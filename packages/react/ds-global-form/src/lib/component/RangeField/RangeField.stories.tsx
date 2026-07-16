import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { RangeField } from "./index.js";

const meta = {
  title: "components/RangeField",
  component: RangeField,
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
