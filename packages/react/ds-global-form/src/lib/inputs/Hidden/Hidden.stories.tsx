import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hidden } from "./Hidden.js";

const meta = {
  title: "subcomponents/HiddenInput",
  component: Hidden,
  tags: ["autodocs"],
  parameters: { chromatic: { disableSnapshot: true } },
} satisfies Meta<typeof Hidden>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "hidden_field", value: "hidden_value", readOnly: true },
};
