/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Badge.js";

const meta = {
  title: "Badge",
  component: Component,
  parameters: {
    docs: {
      // TODO should we enable this for the entire package by default?
      codePanel: true,
      description: {
        component:
          "A Badge component for displaying numeric values with optional formatting.",
      },
    },
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 500,
  },
};

export const LargeNumber: Story = {
  args: {
    value: 12345,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Numbers without compact overflowStrategy are displayed up to the maximum (999), and a '+' suffix is added when they exceed this limit. This prevents UI overflow while indicating that the actual value is larger. Ideal for scenarios where you need to show 'many' without overwhelming the user with large numbers.",
      },
    },
  },
};

export const LargeNumberCompacted: Story = {
  args: {
    ...LargeNumber.args,
    overflowStrategy: "compact",
  },
  parameters: {
    docs: {
      description: {
        story:
          "compact overflowStrategy rounds values over 999 to their nearest unit (i.e., 1,234 -> 1.23k), allowing for up to 5 characters. This provides human-readable formatting for large numbers while maintaining reasonable overflowStrategy.",
      },
    },
  },
};

export const MaxValue: Story = {
  args: {
    value: 1324564551231125,
    overflowStrategy: "compact",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Values exceeding 999T are automatically capped and displayed as '999T+'. This prevents UI overflow while clearly communicating that the actual value is beyond the displayable range.",
      },
    },
  },
};

export const NegativeValue: Story = {
  args: {
    value: -1,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Negative values are automatically converted to 0 to maintain the Badge's semantic meaning as a count or quantity indicator.",
      },
    },
  },
};

export const PositiveAppearance: Story = {
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

export const NegativeAppearance: Story = {
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

export const CautionAppearance: Story = {
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

export const InformationAppearance: Story = {
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

export const WithCustomStyling: Story = {
  args: {
    value: 123,
    className: "custom-badge",
    style: { backgroundColor: "#f0f0f0", color: "#333" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "The custom styling variant demonstrates how to override the default Badge appearance using CSS classes and inline styles. This variant is perfect for scenarios where you need to match specific design requirements, integrate with existing design systems, or create branded variations. The custom styling is applied in addition to the base Badge styles, allowing for flexible customization while maintaining the component's core functionality.",
      },
    },
  },
};

export const WithCustomItemOptions: Story = {
  args: {
    value: 15,
    overflowStrategy: "compact",
    itemOptions: { singularStem: "box", pluralSuffix: "es" },
  },
  parameters: {
    docs: {
      description: {
        story:
          "<p>" +
          'The badge uses a <code>title</code> prop to show more context (ex: "15 servers" instead of just "15") about the badge contents on hover. ' +
          "</p>" +
          "<p>" +
          "By default, the item is pluralized by adding an 's' suffix to the singular form \"item\". " +
          "</p>" +
          "<p>" +
          "Custom <code>itemOptions</code> allow for fine-tuning of number unit formatting. " +
          "For example, you can specify singular and plural forms of a unit to ensure grammatical correctness when displaying counts. " +
          "</p>" +
          "<p>" +
          "In this example, 'box' is used for singular (1 box) and 'boxes' for plural (2 boxes). This is particularly useful in applications where the Badge represents quantities of specific items." +
          "</p>",
      },
    },
  },
};
