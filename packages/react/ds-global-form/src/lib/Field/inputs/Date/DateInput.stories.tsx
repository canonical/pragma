import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import Component from "./DateInput.js";

const meta = {
  title: "Field/inputs/Date",
  component: Component,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "birthday",
    label: "Birthday",
  },
};

export const WithMinMax: Story = {
  args: {
    name: "appointment",
    label: "Appointment date",
    min: "2024-01-01",
    max: "2025-12-31",
  },
};

export const Disabled: Story = {
  args: {
    name: "date_disabled",
    label: "Date (disabled)",
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    name: "date_error",
    label: "Date (required)",
    registerProps: { required: "Date is required" },
  },
  decorators: [
    decorators.form({
      touchedFields: ["date_error"],
    }),
  ],
};
