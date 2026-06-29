import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckboxInput } from "./CheckboxInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/CheckboxInput",
  component: CheckboxInput,
  tags: ["autodocs"],
} satisfies Meta<typeof CheckboxInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "subscribe" },
};

export const Checked: Story = {
  args: { name: "subscribe_checked", defaultChecked: true },
};

export const Disabled: Story = {
  args: { name: "subscribe_disabled", disabled: true },
};
