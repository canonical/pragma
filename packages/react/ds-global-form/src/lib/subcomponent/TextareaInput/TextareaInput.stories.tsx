import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { TextareaInput } from "./TextareaInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/TextareaInput",
  component: TextareaInput,
  tags: ["autodocs"],
} satisfies Meta<typeof TextareaInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "content" },
};

export const Rows: Story = {
  args: { name: "content", rows: 7 },
};

export const Disabled: Story = {
  args: { name: "content", disabled: true },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see TextareaField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { name: "bio" },
};
