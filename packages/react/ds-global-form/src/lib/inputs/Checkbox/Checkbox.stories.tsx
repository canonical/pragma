import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/CheckboxInput",
  component: Checkbox,
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

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
