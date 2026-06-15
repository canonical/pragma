import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { DateRangeField } from "./index.js";

const meta = {
  title: "Fields/DateRangeField",
  component: DateRangeField,
  tags: ["autodocs"],
  decorators: [
    decorators.form({ defaultValues: { arrival: "", departure: "" } }),
  ],
} satisfies Meta<typeof DateRangeField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ArrivalDeparture: Story = {
  args: {
    startName: "arrival",
    endName: "departure",
    label: "Trip dates",
    startLabel: "Arrival",
    endLabel: "Departure",
    description: "Select your arrival and departure dates.",
  },
};
