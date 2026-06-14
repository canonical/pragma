import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { DatePickerField } from "./index.js";

const meta = {
  title: "Fields/DatePicker",
  component: DatePickerField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof DatePickerField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "departure", label: "Departure date" },
};
