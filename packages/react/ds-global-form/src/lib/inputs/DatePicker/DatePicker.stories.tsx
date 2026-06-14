import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker } from "./DatePicker.js";

const meta = {
  title: "Inputs/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string>("");
    return <DatePicker {...args} value={value} onChange={setValue} />;
  },
};

export const WithValue: Story = {
  render: (args) => {
    const [value, setValue] = useState<string>("2026-06-14");
    return <DatePicker {...args} value={value} onChange={setValue} />;
  },
};
