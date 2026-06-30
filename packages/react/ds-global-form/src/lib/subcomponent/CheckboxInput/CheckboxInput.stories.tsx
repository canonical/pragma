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

/**
 * The indeterminate ("partially checked") state shows a minus glyph. It is a
 * DOM property, not an attribute, so it can only be set on the element via a
 * ref — there is no `indeterminate` prop to pass.
 */
export const Indeterminate: Story = {
  args: { name: "subscribe_indeterminate" },
  render: (args) => (
    <CheckboxInput
      {...args}
      ref={(el) => {
        if (el) el.indeterminate = true;
      }}
    />
  ),
};

export const Disabled: Story = {
  args: { name: "subscribe_disabled", disabled: true },
};

export const DisabledChecked: Story = {
  args: {
    name: "subscribe_disabled_checked",
    disabled: true,
    defaultChecked: true,
  },
};

/** The indeterminate glyph in the disabled state. */
export const DisabledIndeterminate: Story = {
  args: { name: "subscribe_disabled_indeterminate", disabled: true },
  render: (args) => (
    <CheckboxInput
      {...args}
      ref={(el) => {
        if (el) el.indeterminate = true;
      }}
    />
  ),
};
