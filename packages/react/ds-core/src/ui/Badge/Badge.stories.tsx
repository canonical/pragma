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
          "Numbers are displayed with up to 4 characters. If the number cannot be represented in 4 characters, 3 characters (in this case, 9's) will be followed by an overflow indicator (" +
          ") to indicate the number cannot fit in the Badge.  This prevents UI overflow while indicating that the actual value is larger.",
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
          "Compact overflow strategy adjusts the radix to show as much precision as can be represented in 4 characters, and includes unit positional notation if needed. This provides human-readable formatting for large numbers.",
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
