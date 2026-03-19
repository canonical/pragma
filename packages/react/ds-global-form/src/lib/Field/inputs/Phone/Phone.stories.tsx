import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import Component from "./Phone.js";

const meta = {
  title: "Field/inputs/Phone",
  component: Component,
  decorators: [decorators.form()],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "phone",
    label: "Phone number",
  },
};

export const WithDefaultCountry: Story = {
  args: {
    name: "phone_uk",
    label: "Phone (UK default)",
    defaultCountry: "GB",
  },
};

export const WithPreferredCountries: Story = {
  args: {
    name: "phone_preferred",
    label: "Phone (preferred countries)",
    preferredCountries: ["US", "GB", "CA"],
  },
};

export const StructuredValue: Story = {
  args: {
    name: "phone_structured",
    label: "Phone (structured value)",
    valueFormat: "structured",
  },
};

export const Disabled: Story = {
  args: {
    name: "phone_disabled",
    label: "Phone (disabled)",
    disabled: true,
  },
};
