import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { NumberField } from "./index.js";

// Field-tier stories run inside a form decorator (label/description/error +
// react-hook-form state).
const meta = {
  title: "components/NumberField",
  component: NumberField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof NumberField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "quantity", label: "Quantity" },
};

export const WithRange: Story = {
  args: {
    name: "quantity",
    label: "Quantity",
    description: "Between 0 and 10.",
    min: 0,
    max: 10,
    step: 1,
  },
};

export const WithUnits: Story = {
  args: { name: "price", label: "Price", prefix: "$", suffix: "USD" },
};
