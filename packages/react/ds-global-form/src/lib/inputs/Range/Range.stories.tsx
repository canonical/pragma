import type { Meta, StoryObj } from "@storybook/react-vite";
import { Range } from "./Range.js";

const meta = {
  title: "subcomponents/RangeInput",
  component: Range,
  tags: ["autodocs"],
} satisfies Meta<typeof Range>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "volume", min: 0, max: 100, defaultValue: 50 },
};
