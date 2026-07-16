import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { TextInput } from "./TextInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "subcomponents/TextInput",
  component: TextInput,
  tags: ["autodocs"],
} satisfies Meta<typeof TextInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "full_name", placeholder: "Jane Doe" },
};

export const Email: Story = {
  args: { name: "email", inputType: "email" },
};

export const WithPrefix: Story = {
  args: { name: "username", prefix: "@" },
};

export const WithSuffix: Story = {
  args: { name: "domain", suffix: ".domain.com" },
};

export const Disabled: Story = {
  args: { name: "disabled_example", disabled: true },
};

/**
 * Presentational error state: the bare input wrapped in the field `.danger`
 * context (the visual layer the Wrapper applies on a real validation error).
 * For the react-hook-form-driven error see TextField's `WithError`.
 */
export const ErrorState: Story = {
  decorators: [decorators.danger()],
  args: { name: "full_name" },
};
