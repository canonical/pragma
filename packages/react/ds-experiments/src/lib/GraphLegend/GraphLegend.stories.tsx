import type { Meta, StoryObj } from "@storybook/react-vite";
import GraphLegend from "./GraphLegend.js";

const meta: Meta<typeof GraphLegend> = {
  title: "Components/GraphLegend",
  component: GraphLegend,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GraphLegend>;

export const Default: Story = {};

/** Explain only a subset of kinds — e.g. a tokens-focused view. */
export const EntitiesOnly: Story = {
  args: {
    relationKinds: [],
  },
};

/** Drop the heading when the legend sits inside a titled panel. */
export const WithoutHeading: Story = {
  args: {
    heading: null,
  },
};
