import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Calendar } from "./Calendar.js";

const FIXED = new CalendarDate(2026, 6, 15);

// Presentational stories: Calendar is controlled directly via useState, no form
// decorator. State is owned by the story `render`; `args.value` seeds it.
const meta = {
  title: "Inputs/DatePicker/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  args: { value: FIXED, onChange: () => {}, locale: "en-US" },
  render: (args) => {
    const [value, setValue] = useState<CalendarDate | null>(args.value);
    return <Calendar {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { value: null, focusedValue: FIXED },
};

export const WithMinMax: Story = {
  args: {
    minValue: new CalendarDate(2026, 6, 10),
    maxValue: new CalendarDate(2026, 6, 25),
  },
};

export const WithUnavailableDates: Story = {
  args: {
    // Weekends are unavailable.
    isDateUnavailable: (date) => {
      const day = date.toDate(getLocalTimeZone()).getDay();
      return day === 0 || day === 6;
    },
  },
};

export const Disabled: Story = {
  args: { isDisabled: true },
};

export const FrenchLocale: Story = {
  args: { locale: "fr-FR" },
};

export const Today: Story = {
  args: { value: null, focusedValue: today(getLocalTimeZone()) },
};
