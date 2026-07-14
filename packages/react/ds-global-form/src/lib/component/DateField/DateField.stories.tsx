import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { DateField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/DateField",
  component: DateField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof DateField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "birthday",
    label: "Birthday",
  },
};

/** Helper text via the `description` prop, rendered under the label. */
export const WithDescription: Story = {
  args: {
    name: "birthday_desc",
    label: "Birthday",
    description: "We use this to send you a discount on your birthday.",
  },
};

export const WithMinMax: Story = {
  args: {
    name: "appointment",
    label: "Appointment date",
    description: "Choose a date between 1 Jan 2024 and 31 Dec 2025.",
    min: "2024-01-01",
    max: "2025-12-31",
  },
};

/**
 * A value outside the min/max range now reports an inline error — the `min`/
 * `max` props are wired as react-hook-form rules, not just native attributes.
 */
export const OutOfRange: Story = {
  args: {
    name: "appointment_oor",
    label: "Appointment date",
    min: "2024-01-01",
    max: "2025-12-31",
  },
  decorators: [
    decorators.form({
      defaultValues: { appointment_oor: "2030-06-15" },
      touchedFields: ["appointment_oor"],
    }),
  ],
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
