import type { Meta, StoryObj } from "@storybook/react-vite";
import { SwitchInput } from "./SwitchInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/SwitchInput",
  component: SwitchInput,
} satisfies Meta<typeof SwitchInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "notifications" },
};

export const Checked: Story = {
  args: { name: "notifications_checked", defaultChecked: true },
};

export const Disabled: Story = {
  args: { name: "notifications_disabled", disabled: true },
};

export const DisabledChecked: Story = {
  args: {
    name: "notifications_disabled_checked",
    disabled: true,
    defaultChecked: true,
  },
};
