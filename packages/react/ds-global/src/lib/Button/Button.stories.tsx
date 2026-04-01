import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import Component from "./Button.js";

const meta = {
  title: "Beta/Button",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    anticipation: {
      control: "select",
      options: [undefined, ...MODIFIER_FAMILIES.anticipation],
    },
    variant: {
      control: "select",
      options: [undefined, "link"],
    },
    iconPosition: {
      control: "select",
      options: ["start", "end"],
    },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

/**
 * Anticipation modifiers express the expected consequence of an action.
 */
export const Anticipation: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Component {...args}>Default</Component>
      {MODIFIER_FAMILIES.anticipation.map((value) => (
        <Component key={value} {...args} anticipation={value}>
          {value}
        </Component>
      ))}
    </div>
  ),
  args: { children: "Not rendered" },
};

/**
 * Link variant renders as inline text with underline.
 */
export const LinkVariant: Story = {
  args: {
    children: "Learn more",
    variant: "link",
  },
};

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M4 4l1 10h6l1-10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

/**
 * Button with icon and label.
 */
export const WithIcon: Story = {
  args: {
    children: "Delete",
    icon: <TrashIcon />,
    anticipation: "destructive",
  },
};

/**
 * Disabled button using design-tokens disabled state variables.
 */
export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};
