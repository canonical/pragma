/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import * as fixtures from "storybook/fixtures.options.js";
import { Combobox } from "./Combobox.js";

// Presentational stories: the combobox is controlled directly, no form.
const meta = {
  title: "Inputs/Combobox",
  component: Combobox,
  tags: ["autodocs"],
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>();
    return <Combobox {...args} value={value} onChange={setValue} />;
  },
  args: { options: fixtures.fruits },
};

export const Multiple: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>([]);
    return <Combobox {...args} value={value} onChange={setValue} />;
  },
  args: { isMultiple: true, options: fixtures.fruits },
};
