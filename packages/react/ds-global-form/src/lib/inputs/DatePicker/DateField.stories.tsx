import { CalendarDate } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DateField } from "./DateField.js";

// Presentational stories: DateField is controlled directly by a CalendarDate,
// no form. Each story wires its own useState so segments round-trip.
const meta = {
  title: "Inputs/DatePicker/DateField",
  component: DateField,
  tags: ["autodocs"],
} satisfies Meta<typeof DateField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: (args) => {
    const [value, setValue] = useState<CalendarDate | null>(null);
    return <DateField {...args} value={value} onChange={setValue} />;
  },
  args: { value: null, onChange: () => {} },
};

export const WithValue: Story = {
  render: (args) => {
    const [value, setValue] = useState<CalendarDate | null>(
      new CalendarDate(2024, 6, 14),
    );
    return <DateField {...args} value={value} onChange={setValue} />;
  },
  args: { value: null, onChange: () => {} },
};

export const UKLocale: Story = {
  render: (args) => {
    const [value, setValue] = useState<CalendarDate | null>(
      new CalendarDate(2024, 6, 14),
    );
    return (
      <DateField {...args} value={value} onChange={setValue} locale="en-GB" />
    );
  },
  args: { value: null, onChange: () => {} },
};

export const WithMinMax: Story = {
  render: (args) => {
    const [value, setValue] = useState<CalendarDate | null>(null);
    return (
      <DateField
        {...args}
        value={value}
        onChange={setValue}
        minValue={new CalendarDate(2024, 1, 1)}
        maxValue={new CalendarDate(2024, 12, 31)}
      />
    );
  },
  args: { value: null, onChange: () => {} },
};

export const Disabled: Story = {
  render: (args) => {
    const [value, setValue] = useState<CalendarDate | null>(
      new CalendarDate(2024, 6, 14),
    );
    return <DateField {...args} value={value} onChange={setValue} isDisabled />;
  },
  args: { value: null, onChange: () => {} },
};
