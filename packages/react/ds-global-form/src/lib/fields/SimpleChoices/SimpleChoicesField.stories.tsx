import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import * as fixtures from "storybook/fixtures.options.js";
import { SimpleChoicesField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "Fields/SimpleChoices",
  component: SimpleChoicesField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof SimpleChoicesField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "select",
    label: "Select a continent",
    options: fixtures.continents,
  },
};

export const Multiple: Story = {
  args: {
    name: "select2",
    label: "Select continents",
    options: fixtures.continents,
    isMultiple: true,
  },
};

export const Stacked: Story = {
  args: {
    name: "select_stacked",
    label: "Select a continent",
    options: fixtures.continents,
    layout: "stacked",
  },
};

export const StackedMultiple: Story = {
  args: {
    name: "select_stacked_multiple",
    label: "Select continents",
    options: fixtures.continents,
    isMultiple: true,
    layout: "stacked",
  },
};
