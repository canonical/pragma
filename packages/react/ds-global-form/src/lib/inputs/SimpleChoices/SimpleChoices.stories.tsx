/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import * as fixtures from "storybook/fixtures.options.js";
import { SimpleChoices } from "./SimpleChoices.js";

// Presentational stories: SimpleChoices is controlled directly, no form.
const meta = {
  title: "Inputs/SimpleChoices",
  component: SimpleChoices,
  tags: ["autodocs"],
} satisfies Meta<typeof SimpleChoices>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>();
    return <SimpleChoices {...args} value={value} onChange={setValue} />;
  },
  args: { name: "select", options: fixtures.continents },
};

export const Multiple: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>([]);
    return <SimpleChoices {...args} value={value} onChange={setValue} />;
  },
  args: { name: "select2", options: fixtures.continents, isMultiple: true },
};

export const Stacked: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>();
    return <SimpleChoices {...args} value={value} onChange={setValue} />;
  },
  args: {
    name: "select_stacked",
    options: fixtures.continents,
    layout: "stacked",
  },
};

export const StackedMultiple: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | string[] | undefined>([]);
    return <SimpleChoices {...args} value={value} onChange={setValue} />;
  },
  args: {
    name: "select_stacked_multiple",
    options: fixtures.continents,
    isMultiple: true,
    layout: "stacked",
  },
};
