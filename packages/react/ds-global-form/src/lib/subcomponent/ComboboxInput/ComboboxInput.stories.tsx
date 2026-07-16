/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import * as fixtures from "storybook/fixtures.options.js";
import { ComboboxInput } from "./ComboboxInput.js";

// Presentational stories: the combobox is controlled directly, no form.
const meta = {
  title: "_work_in_progress/subcomponent/ComboboxInput",
  component: ComboboxInput,
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
