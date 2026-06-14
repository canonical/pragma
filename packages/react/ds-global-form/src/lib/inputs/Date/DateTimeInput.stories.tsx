import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateTimeInput } from "./DateTimeInput.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "Inputs/DateTime",
  component: DateTimeInput,
  tags: ["autodocs"],
} satisfies Meta<typeof DateTimeInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "event_datetime" },
};

export const WithMinMax: Story = {
  args: {
    name: "booking",
    min: "2024-01-01T00:00",
    max: "2025-12-31T23:59",
  },
};

export const Disabled: Story = {
  args: { name: "datetime_disabled", disabled: true },
};
