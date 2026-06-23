import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { DateInputField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "Fields/Date",
  component: DateInputField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof DateInputField>;

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
