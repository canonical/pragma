import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Phone } from "./Phone.js";
import type { PhoneValue } from "./types.js";

// Presentational stories: the phone input is controlled directly, no form.
const meta = {
  title: "Inputs/Phone",
  component: Phone,
  tags: ["autodocs"],
} satisfies Meta<typeof Phone>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | PhoneValue>("");
    return (
      <Phone {...args} value={value} onChange={(next) => setValue(next)} />
    );
  },
  args: { defaultCountry: "US" },
};

export const StructuredValue: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | PhoneValue>({
      countryCode: "US",
      number: "",
    });
    return (
      <Phone {...args} value={value} onChange={(next) => setValue(next)} />
    );
  },
  args: { defaultCountry: "US", valueFormat: "structured" },
};
