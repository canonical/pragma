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
 * Presentational error state: the bare slider wrapped in the field `.danger`
 * context. The slider has no error border of its own — the error is conveyed by
 * the `FieldError` message (in RangeField the error chrome lands on the
 * canonical number input, not the slider). For the react-hook-form-driven error
 * see RangeField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { name: "volume", min: 0, max: 100, defaultValue: 50 },
};
