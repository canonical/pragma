import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { DateInput } from "./DateInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/DateInput",
  component: DateInput,
  tags: ["autodocs"],
} satisfies Meta<typeof DateInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "birthday" },
};

export const WithMinMax: Story = {
  args: { name: "appointment", min: "2024-01-01", max: "2025-12-31" },
};

export const Disabled: Story = {
  args: { name: "date_disabled", disabled: true },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see DateField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { name: "start_date" },
};
