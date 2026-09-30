import type { Meta, StoryObj } from "@storybook/react-vite";
import { RangeInput } from "./RangeInput.js";

const meta = {
  title: "subcomponents/RangeInput",
  component: RangeInput,
} satisfies Meta<typeof RangeInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "volume", min: 0, max: 100, defaultValue: 50 },
};
