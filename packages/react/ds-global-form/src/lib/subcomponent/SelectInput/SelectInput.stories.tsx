import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import * as fixtures from "storybook/fixtures.options.js";
import { SelectInput } from "./SelectInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/SelectInput",
  component: SelectInput,
  tags: ["autodocs"],
} satisfies Meta<typeof SelectInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "select", options: fixtures.fruits },
};

export const Disabled: Story = {
  args: { name: "select_disabled", options: fixtures.fruits, disabled: true },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see SelectField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { name: "select", options: fixtures.fruits },
};
