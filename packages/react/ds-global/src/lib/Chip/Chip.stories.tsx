import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Component from "./Chip.js";

const meta = {
  title: "Experimental/Chip",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    criticality: {
      options: [undefined, ...MODIFIER_FAMILIES.criticality],
      control: { type: "radio" },
    },
    release: {
      options: [undefined, ...MODIFIER_FAMILIES.release],
      control: { type: "radio" },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "24.04",
  },
};

/**
 * Criticality modifiers reflect status of the chip's subject.
 */
export const Criticality: Story = {
  render: (args) => (
    <div>
      <Component lead="LTS" value="20.04" {...args} />
      {MODIFIER_FAMILIES.criticality.map((value) => (
        <Component key={value} {...args} value={value} criticality={value} />
      ))}
    </div>
  ),
  args: { value: "Not rendered" },
};

/**
 * Release modifiers indicate the maturity stage.
 */
export const Release: Story = {
  render: (args) => (
    <div>
      {MODIFIER_FAMILIES.release.map((value) => (
        <Component key={value} {...args} value={value} release={value} />
      ))}
    </div>
  ),
  args: { value: "Not rendered" },
};

export const Clickable: Story = {
  args: {
    onClick: fn(),
    value: "Download",
  },
};

export const Dismissible: Story = {
  args: {
    onDismiss: fn(),
    value: "Dismiss",
  },
};
