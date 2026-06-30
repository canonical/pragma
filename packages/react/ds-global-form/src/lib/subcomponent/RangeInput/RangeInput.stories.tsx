import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { RangeInput } from "./RangeInput.js";

const meta = {
  title: "subcomponents/RangeInput",
  component: RangeInput,
  tags: ["autodocs"],
} satisfies Meta<typeof RangeInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "volume", min: 0, max: 100, defaultValue: 50 },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see RangeField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { name: "volume", min: 0, max: 100, defaultValue: 50 },
};
