/* @canonical/generator-ds 0.10.0-experimental.2 */

import { SEVERITY } from "@canonical/ds-types";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Badge.js";

// TODO exclude neutral for now as it is currently very button-centric. See comment in types.ts.
export const BadgeSeverities = SEVERITY.filter((s) => s !== "neutral");

const meta = {
  title: "Badge/Appearance",
  component: Component,
  // TODO remove after fixing neutral severity issue mentioned above
  excludeStories: ["BadgeSeverities"],
  parameters: {
    docs: {
      codePanel: true,
      description: {
        component:
          "Badge appearance variants for different semantic severities.",
      },
    },
  },
  args: {
    value: 42,
  },
  argTypes: {
    appearance: {
      options: BadgeSeverities,
      control: "select",
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Positive: Story = {
  args: {
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
