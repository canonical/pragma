import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { PhoneInput } from "./PhoneInput.js";
import type { PhoneValue } from "./types.js";

// Presentational stories: the phone input is controlled directly, no form.
const meta = {
  title: "subcomponents/PhoneInput",
  component: PhoneInput,
  tags: ["autodocs"],
} satisfies Meta<typeof PhoneInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | PhoneValue>("");
    return (
      <PhoneInput {...args} value={value} onChange={(next) => setValue(next)} />
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
      <PhoneInput {...args} value={value} onChange={(next) => setValue(next)} />
    );
  },
  args: { defaultCountry: "US", valueFormat: "structured" },
};

export const FlagDisplay: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | PhoneValue>("");
    return (
      <PhoneInput {...args} value={value} onChange={(next) => setValue(next)} />
    );
  },
  args: { defaultCountry: "US", countryDisplay: "flag" },
};

export const PreferredCountries: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | PhoneValue>("");
    return (
      <PhoneInput {...args} value={value} onChange={(next) => setValue(next)} />
    );
  },
  args: { defaultCountry: "GB", preferredCountries: ["GB", "FR"] },
};
