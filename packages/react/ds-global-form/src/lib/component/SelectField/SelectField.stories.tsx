import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import * as fixtures from "storybook/fixtures.options.js";
import { SelectField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/SelectField",
  component: SelectField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof SelectField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "select", label: "Select", options: fixtures.fruits },
};

export const Disabled: Story = {
  args: {
    name: "select_disabled",
    label: "Select",
    options: fixtures.fruits,
    disabled: true,
  },
};

/** Error state: touched + failing validation → the field shows `.danger` chrome + the error message. */
export const WithError = errorStory({
  name: "err_select",
  label: "Fruit",
  extraArgs: { options: fixtures.fruits },
});
