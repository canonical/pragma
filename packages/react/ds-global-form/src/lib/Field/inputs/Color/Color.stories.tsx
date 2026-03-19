import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import Component from "./Color.js";

const meta = {
  title: "Field/inputs/Color",
  component: Component,
  decorators: [decorators.form()],
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "brand_color",
    label: "Brand color",
  },
};

export const CustomSwatches: Story = {
  args: {
    name: "theme_color",
    label: "Theme color",
    swatches: [
      "#1e293b",
      "#334155",
      "#475569",
      "#0ea5e9",
      "#06b6d4",
      "#14b8a6",
      "#10b981",
      "#84cc16",
      "#f59e0b",
      "#f97316",
    ],
  },
};

export const HexInputOnly: Story = {
  args: {
    name: "custom_color",
    label: "Custom color (hex only)",
    swatches: [],
    showHexInput: true,
  },
};

export const Disabled: Story = {
  args: {
    name: "color_disabled",
    label: "Color (disabled)",
    disabled: true,
  },
};
