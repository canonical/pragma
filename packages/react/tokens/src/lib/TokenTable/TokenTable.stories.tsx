import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockTokens } from "../mockTokens.js";
import { TokenTable as Component } from "./TokenTable.js";

const meta: Meta<typeof Component> = {
  title: "Foundations/Tokens/Internal/TokenTable",
  component: Component,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {
    tokens: mockTokens.slice(0, 6),
    title: "Compact token explorer",
    caption: "Dense default rendering for the restored token explorer.",
    showCount: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Default rendering with a small token slice, automatic column inference, and count badge.",
      },
    },
  },
};

export const GroupedAndSearchable: Story = {
  args: {
    tokens: mockTokens,
    title: "Grouped by output file",
    groupBy: "cssOutputFile",
    searchable: true,
    columns: ["token", "swatch", "type", "tier", "stability"],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Full curated set grouped by CSS output file with search enabled and explicit column selection.",
      },
    },
  },
};
