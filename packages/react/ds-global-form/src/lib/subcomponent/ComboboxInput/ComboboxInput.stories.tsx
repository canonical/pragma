/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import * as decorators from "storybook/decorators.js";
import * as fixtures from "storybook/fixtures.options.js";
import { ComboboxInput } from "./ComboboxInput.js";

// Presentational stories: the combobox is controlled directly, no form.
const meta = {
  title: "subcomponents/ComboboxInput",
  component: ComboboxInput,
  tags: ["autodocs"],
} satisfies Meta<typeof ComboboxInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>();
    return <ComboboxInput {...args} value={value} onChange={setValue} />;
  },
  args: { options: fixtures.fruits },
};

export const Multiple: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>([]);
    return <ComboboxInput {...args} value={value} onChange={setValue} />;
  },
  args: { isMultiple: true, options: fixtures.fruits },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see ComboboxField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { options: fixtures.fruits },
};
