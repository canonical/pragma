import type { Meta, StoryObj } from "@storybook/react-vite";
import { HiddenInput } from "./HiddenInput.js";

const meta = {
  title: "subcomponents/HiddenInput",
  component: HiddenInput,
  parameters: { chromatic: { disableSnapshot: true } },
} satisfies Meta<typeof HiddenInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "hidden_field", value: "hidden_value", readOnly: true },
};
