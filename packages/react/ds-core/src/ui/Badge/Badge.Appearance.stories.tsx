/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Badge.js";

const meta = {
  title: "Badge/Appearance",
  component: Component,
  parameters: {
    docs: {
      codePanel: true,
      description: {
        component:
          "Badge appearance variants for different semantic severities.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Positive: Story = {
  args: {
    value: 42,
    appearance: "positive",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The positive appearance uses green styling to indicate success, completion, or positive status.",
      },
    },
  },
};

export const Negative: Story = {
  args: {
    value: 99,
    appearance: "negative",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The negative appearance uses red styling to indicate errors, failures, or critical status.",
      },
    },
  },
};

export const Caution: Story = {
  args: {
    value: 7,
    appearance: "caution",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The caution appearance uses yellow/orange styling to indicate warnings, pending states, or items requiring attention.",
      },
    },
  },
};

export const Information: Story = {
  args: {
    value: 3,
    appearance: "information",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The information appearance uses blue styling to indicate informational content, neutral status, or general notifications.",
      },
    },
  },
};
