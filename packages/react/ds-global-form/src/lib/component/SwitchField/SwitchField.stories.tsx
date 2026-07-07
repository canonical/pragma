import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { SwitchField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/SwitchField",
  component: SwitchField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof SwitchField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "notifications", label: "Notifications" },
};

export const Checked: Story = {
  decorators: [
    decorators.form({ defaultValues: { notifications_checked: true } }),
  ],
  args: { name: "notifications_checked", label: "Checked" },
};

export const Disabled: Story = {
  args: {
    name: "notifications_disabled",
    label: "Disabled",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  decorators: [
    decorators.form({
      defaultValues: { notifications_disabled_checked: true },
    }),
  ],
  args: {
    name: "notifications_disabled_checked",
    label: "Disabled checked",
    disabled: true,
  },
};

export const WithDescription: Story = {
  args: {
    name: "notifications_described",
    label: "Email notifications",
    description: "Send me product updates and security alerts.",
  },
};
