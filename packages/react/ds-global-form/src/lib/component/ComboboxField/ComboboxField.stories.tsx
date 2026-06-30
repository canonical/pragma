import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import * as fixtures from "storybook/fixtures.options.js";
import { ComboboxField } from "./index.js";

// Field-tier stories: the combobox bound to react-hook-form, inside a form.
const meta = {
  title: "components/ComboboxField",
  component: ComboboxField,
  tags: ["autodocs"],
  decorators: [
    decorators.form({
      defaultValues: {
        "select-fruit": "apple",
        "select-multiple-fruits": ["apple", "banana"],
      },
    }),
  ],
} satisfies Meta<typeof ComboboxField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "select-fruit", label: "Fruit", options: fixtures.fruits },
};

export const Multiple: Story = {
  args: {
    name: "select-multiple-fruits",
    label: "Fruits",
    isMultiple: true,
    options: fixtures.fruits,
  },
};

/** Error state: touched + failing validation → the field shows `.danger` chrome + the error message. */
export const WithError = errorStory({
  name: "err_combobox",
  label: "Fruit",
  extraArgs: { options: fixtures.fruits },
});
