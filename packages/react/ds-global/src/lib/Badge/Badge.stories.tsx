import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Badge.js";

const meta = {
  title: "Experimental/Badge",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "number" } },
    criticality: {
      options: [undefined, ...MODIFIER_FAMILIES.criticality],
      control: { type: "radio" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 1500,
  },
};

/**
 * Criticality modifiers reflect status: success, error, warning, information.
 */
export const Criticality: Story = {
  render: (args) => (
    <div
      style={{ display: "inline-flex", gap: "var(--spacing-horizontal-small)" }}
    >
      <Component {...args} />
      {MODIFIER_FAMILIES.criticality.map((value) => (
        <Component key={value} {...args} criticality={value} />
      ))}
    </div>
  ),
  args: { value: 42 },
};
