import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import * as decorators from "storybook/decorators.js";
import { ColorInput } from "./ColorInput.js";

// Presentational stories render the input directly, with no form decorator.
// State is owned by the story via `useState` (controlled value/onChange).
const meta = {
  title: "_work_in_progress/subcomponent/ColorInput",
  component: ColorInput,
  tags: ["autodocs"],
  render: (args) => {
    const [value, setValue] = useState(args.value ?? "#000000");
    return <ColorInput {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof ColorInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "#3b82f6" },
};

export const CustomSwatches: Story = {
  args: {
    value: "#0ea5e9",
    swatches: [
      "#1e293b",
      "#334155",
      "#475569",
      "#0ea5e9",
      "#06b6d4",
      "#14b8a6",
      "#10b981",
      "#84cc16",
      "#f59e0b",
      "#f97316",
    ],
  },
};

export const HexInputOnly: Story = {
  args: {
    value: "#22c55e",
    swatches: [],
    showHexInput: true,
  },
};

export const Disabled: Story = {
  args: {
    value: "#6b7280",
    disabled: true,
  },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see ColorField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { value: "#3b82f6" },
};
