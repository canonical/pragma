import type { Meta, StoryObj } from "@storybook/react-vite";
import * as fixtures from "storybook/fixtures.options.js";
import { Select } from "./Select.js";

// Presentational stories render the input directly, with no form decorator.
const meta = {
  title: "Inputs/Select",
  component: Select,
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "select", options: fixtures.fruits },
};

export const Disabled: Story = {
  args: { name: "select_disabled", options: fixtures.fruits, disabled: true },
};
