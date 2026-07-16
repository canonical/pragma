import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { TimeInput } from "./TimeInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/TimeInput",
  component: TimeInput,
  tags: ["autodocs"],
} satisfies Meta<typeof TimeInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "meeting_time" },
};

export const WithStep: Story = {
  args: { name: "precise_time", step: 900 },
};

export const Disabled: Story = {
  args: { name: "time_disabled", disabled: true },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see TimeField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { name: "start_time" },
};
