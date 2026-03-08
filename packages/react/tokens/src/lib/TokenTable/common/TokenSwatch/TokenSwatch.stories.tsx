import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockTokens } from "../../../mockTokens.js";
import { TokenSwatch as Component } from "./TokenSwatch.js";

const colorToken = mockTokens.find(
  (token) => token.type === "color",
) as (typeof mockTokens)[number];
const derivedToken = mockTokens.find(
  (token) => token.derivedFrom && !token.valueLight,
) as (typeof mockTokens)[number];

const meta: Meta<typeof Component> = {
  title: "Foundations/Tokens/Internal/TokenSwatch",
  component: Component,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {
    token: colorToken,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Color token swatch showing the color preview, paired indicator, and hex value.",
      },
    },
  },
};

export const DerivedReference: Story = {
  args: {
    token: derivedToken,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Derived token without a resolved value, rendered as an arrow reference to its base token with derivation badge.",
      },
    },
  },
};
