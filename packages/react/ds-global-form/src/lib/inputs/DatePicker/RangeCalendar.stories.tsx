import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RangeCalendar } from "./RangeCalendar.js";
import type { DateRange } from "./types.js";

const FIXED_RANGE: DateRange = {
  start: new CalendarDate(2026, 6, 10),
  end: new CalendarDate(2026, 6, 16),
};
const FOCUSED = new CalendarDate(2026, 6, 1);

// Presentational stories: RangeCalendar is controlled directly via useState, no
// form decorator. State is owned by the story `render`; `args.value` seeds it.
const meta = {
  title: "Inputs/DatePicker/RangeCalendar",
  component: RangeCalendar,
  tags: ["autodocs"],
  args: {
    value: FIXED_RANGE,
    onChange: () => {},
    focusedValue: FOCUSED,
    locale: "en-US",
  },
  render: (args) => {
    const [value, setValue] = useState<DateRange | null>(args.value);
    return <RangeCalendar {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof RangeCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { value: null, focusedValue: FOCUSED },
};

export const WithMinMax: Story = {
  args: {
    value: null,
    focusedValue: FOCUSED,
    minValue: new CalendarDate(2026, 6, 8),
    maxValue: new CalendarDate(2026, 6, 24),
  },
};

export const WithUnavailableDates: Story = {
  args: {
    value: null,
    focusedValue: FOCUSED,
    // Weekends are unavailable and cannot be range endpoints.
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
