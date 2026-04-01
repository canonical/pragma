import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Label.js";

const meta = {
  title: "Beta/Label",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    anticipation: {
      control: "select",
      options: [undefined, ...MODIFIER_FAMILIES.anticipation],
    },
    criticality: {
      control: "select",
      options: [undefined, ...MODIFIER_FAMILIES.criticality],
    },
    lifecycle: {
      control: "select",
      options: [undefined, ...MODIFIER_FAMILIES.lifecycle],
    },
  },
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Label",
  },
};

/**
 * Anticipation modifiers express expected consequence.
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
 * Criticality modifiers reflect status.
 */
export const Criticality: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <Component {...args}>Default</Component>
      {MODIFIER_FAMILIES.criticality.map((value) => (
        <Component key={value} {...args} criticality={value}>
          {value}
        </Component>
      ))}
    </div>
  ),
  args: { children: "Not rendered" },
};

/**
 * Lifecycle modifiers indicate temporal state.
 */
export const Lifecycle: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {MODIFIER_FAMILIES.lifecycle.map((value) => (
        <Component key={value} {...args} lifecycle={value}>
          {value}
        </Component>
      ))}
    </div>
  ),
  args: { children: "Not rendered" },
};
