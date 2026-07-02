import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import * as fixtures from "storybook/fixtures.options.js";
import { ChoicesField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/ChoicesField",
  component: ChoicesField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof ChoicesField>;

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

/**
 * Column layout: options are laid out in a grid of equal-width columns, so each
 * option's width is column-based rather than sized to its content. Rendered in a
 * `.grid.responsive` context (via the grid decorator) so the form's subgrid has
 * real column tracks — matching how a form is laid out in a real page.
 */
export const Columns: Story = {
  decorators: [decorators.grid(), decorators.form()],
  args: {
    name: "select_columns",
    label: "Select a continent",
    options: fixtures.continents,
    layout: "columns",
    columns: 3,
  },
};

export const ColumnsMultiple: Story = {
  decorators: [decorators.grid(), decorators.form()],
  args: {
    name: "select_columns_multiple",
    label: "Select continents",
    options: fixtures.continents,
    isMultiple: true,
    layout: "columns",
    columns: 2,
  },
};
