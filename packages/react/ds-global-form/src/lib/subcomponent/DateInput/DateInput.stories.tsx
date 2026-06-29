import type { Meta, StoryObj } from "@storybook/react-vite";
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
