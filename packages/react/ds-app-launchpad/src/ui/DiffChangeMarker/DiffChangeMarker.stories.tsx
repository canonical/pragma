/* @canonical/generator-ds 0.9.0-experimental.12 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./DiffChangeMarker.js";

const meta = {
  title: "DiffChangeMarker",
  component: Component,
  tags: ["autodocs"],
  argTypes: {
    markerStyle: {
      options: ["simple", "detailed"],
      control: { type: "radio" },
      description: "Style of the marker (simple icon or detailed text)",
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SimpleAdded: Story = {
  args: {
    markerStyle: "simple",
    type: "added",
  },
};

export const SimpleDeleted: Story = {
  args: {
    markerStyle: "simple",
    type: "deleted",
  },
};

export const SimpleModified: Story = {
  args: {
    markerStyle: "simple",
    type: "modified",
  },
};

export const DetailedAdded: Story = {
  args: {
    markerStyle: "detailed",
    type: "added",
  },
};

export const DetailedDeleted: Story = {
  args: {
    markerStyle: "detailed",
    type: "deleted",
  },
};

export const DetailedModified: Story = {
  args: {
    markerStyle: "detailed",
    type: "modified",
  },
};

// Detailed style with additions/deletions counts
export const DetailedAdditions: Story = {
  args: {
    markerStyle: "detailed",
    additions: 5,
    deletions: 0,
  },
};

export const DetailedDeletions: Story = {
  args: {
    markerStyle: "detailed",
    additions: 0,
    deletions: 3,
  },
};

export const DetailedBoth: Story = {
  args: {
    markerStyle: "detailed",
    additions: 7,
    deletions: 2,
  },
};
