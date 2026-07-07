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

/**
 * With only `label`, it is used as the inline label beside the toggle — the
 * shape a uniform field map produces. No heading is rendered.
 */
export const InlineLabelOnly: Story = {
  args: { name: "notifications_inline", label: "Enable email notifications" },
};

/**
 * Providing both `label` and `controlLabel` renders the full toggle layout: the
 * `label` becomes a heading above, and `controlLabel` is the inline label
 * beside the toggle (which carries the `htmlFor` binding).
 */
export const WithHeading: Story = {
  args: {
    name: "notifications_heading",
    label: "Notifications",
    controlLabel: "Email updates",
  },
};

/** Heading, description, then the toggle with its inline label. */
export const WithDescription: Story = {
  args: {
    name: "notifications_described",
    label: "Notifications",
    controlLabel: "Email updates",
    description: "Send me product updates and security alerts.",
  },
};
