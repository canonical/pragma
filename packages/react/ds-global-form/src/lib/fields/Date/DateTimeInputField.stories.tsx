import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { DateTimeInputField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "Fields/DateTime",
  component: DateTimeInputField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof DateTimeInputField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "event_datetime",
    label: "Event date and time",
  },
};

export const WithMinMax: Story = {
  args: {
    name: "booking",
    label: "Booking (constrained)",
    min: "2024-01-01T00:00",
    max: "2025-12-31T23:59",
  },
};

export const Disabled: Story = {
  args: {
    name: "datetime_disabled",
    label: "Date & time (disabled)",
    disabled: true,
  },
};
