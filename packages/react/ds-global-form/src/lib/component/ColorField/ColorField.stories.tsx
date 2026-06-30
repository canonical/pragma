import type { Meta, StoryObj } from "@storybook/react-vite";
import * as decorators from "storybook/decorators.js";
import { errorStory } from "storybook/errorStory.js";
import { ColorField } from "./index.js";

// Field-tier stories: the color input bound to react-hook-form, inside a form.
const meta = {
  title: "_work_in_progress/component/ColorField",
  component: ColorField,
  tags: ["autodocs"],
  decorators: [decorators.form()],
} satisfies Meta<typeof ColorField>;

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

/**
 * Error state: touched + failing validation → the field shows `.danger` chrome
 * + the error message. ColorField always carries a non-empty value (it binds
 * with a `#000000` default), so a plain `required` rule can't fail — this uses
 * a `validate` rule to force the error instead.
 */
export const WithError = errorStory({
  name: "err_color",
  label: "Brand colour",
  registerProps: { validate: () => "Pick a brand colour" },
});
